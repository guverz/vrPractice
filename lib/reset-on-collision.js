(function() {
    AFRAME.registerComponent('reset-on-collision', {
        schema: {
            with: {default: '.collision'},
            colliderSize: {default: 0.5},
            smoothRecovery: {default: true},
            pushBackDistance: {default: 0}
        },

        init: function() {
            this.el.setAttribute('geometry', `width: ${this.data.colliderSize}; depth: ${this.data.colliderSize}; height: ${this.data.colliderSize}`);
            
            this.mesh = this.el.getObject3D('mesh');
            this.boundingBox = new THREE.Box3();
            this.collideWiths = this.el.sceneEl.querySelectorAll(this.data.with);
            
            this.lastKnownGoodPosition = new THREE.Vector3().copy(this.el.object3D.position);
            this.isColliding = false;
            this.collisionRecoverySpeed = 0.3;
            
            // Для отслеживания предыдущей позиции
            this.previousPosition = new THREE.Vector3().copy(this.el.object3D.position);
        },

        tick: function () {
            if (!this.mesh) return;

            this.boundingBox.setFromObject(this.mesh);
            var thisMin = this.boundingBox.min;
            var thisMax = this.boundingBox.max;

            var currentPosition = new THREE.Vector3().copy(this.el.object3D.position);
            var collisionResult = this.checkCollision(thisMin, thisMax);

            if (collisionResult.colliding) {
                var pushBackPosition = this.calculatePushBackPosition(currentPosition, collisionResult);
                
                if (this.data.smoothRecovery) {
                    var newPosition = new THREE.Vector3();
                    newPosition.lerpVectors(currentPosition, pushBackPosition, this.collisionRecoverySpeed);
                    this.el.setAttribute('position', newPosition);
                } else {
                    this.el.setAttribute('position', pushBackPosition);
                }
                
                this.lastKnownGoodPosition.copy(pushBackPosition);
                this.isColliding = true;
            } else {
                if (!this.isColliding) {
                    this.lastKnownGoodPosition.copy(currentPosition);
                }
                this.isColliding = false;
            }
            
            // Сохраняем текущую позицию для следующего кадра
            this.previousPosition.copy(currentPosition);
        },

        checkCollision: function(thisMin, thisMax) {
            var collisions = [];
            
            for (var i = 0; i < this.collideWiths.length; i++) {
                var collideWith = this.collideWiths[i];
                var collideWithMesh = collideWith.getObject3D('mesh');
                
                if (!collideWithMesh) continue;

                var collideWithBoundingBox = new THREE.Box3().setFromObject(collideWithMesh);
                var collideWithMin = collideWithBoundingBox.min;
                var collideWithMax = collideWithBoundingBox.max;

                var isColliding = (thisMin.x <= collideWithMax.x && thisMax.x >= collideWithMin.x) &&
                                 (thisMin.y <= collideWithMax.y && thisMax.y >= collideWithMin.y) &&
                                 (thisMin.z <= collideWithMax.z && thisMax.z >= collideWithMin.z);

                if (isColliding) {
                    collisions.push({
                        collideWithBox: collideWithBoundingBox,
                        playerBox: new THREE.Box3().set(thisMin, thisMax)
                    });
                }
            }
            
            return {
                colliding: collisions.length > 0,
                collisions: collisions
            };
        },

        calculatePushBackPosition: function(currentPosition, collision) {
            var pushBack = new THREE.Vector3().copy(currentPosition);
            
            // Обрабатываем все столкновения
            for (var i = 0; i < collision.collisions.length; i++) {
                var singleCollision = collision.collisions[i];
                var playerBox = singleCollision.playerBox;
                var obstacleBox = singleCollision.collideWithBox;
                
                // Вычисляем векторы от центра игрока к центру препятствия
                var playerCenter = new THREE.Vector3();
                playerBox.getCenter(playerCenter);
                
                var obstacleCenter = new THREE.Vector3();
                obstacleBox.getCenter(obstacleCenter);
                
                var direction = new THREE.Vector3().subVectors(playerCenter, obstacleCenter);
                
                // Вычисляем перекрытия по всем осям
                var overlapX = Math.min(playerBox.max.x - obstacleBox.min.x, obstacleBox.max.x - playerBox.min.x);
                var overlapZ = Math.min(playerBox.max.z - obstacleBox.min.z, obstacleBox.max.z - playerBox.min.z);
                
                // Определяем ось с минимальным перекрытием (наименьшее сопротивление)
                if (Math.abs(overlapX) < Math.abs(overlapZ)) {
                    // Выталкиваем по X оси
                    if (direction.x > 0) {
                        pushBack.x = obstacleBox.max.x + (playerBox.max.x - playerBox.min.x) / 2 + this.data.pushBackDistance;
                    } else {
                        pushBack.x = obstacleBox.min.x - (playerBox.max.x - playerBox.min.x) / 2 - this.data.pushBackDistance;
                    }
                } else {
                    // Выталкиваем по Z оси
                    if (direction.z > 0) {
                        pushBack.z = obstacleBox.max.z + (playerBox.max.z - playerBox.min.z) / 2 + this.data.pushBackDistance;
                    } else {
                        pushBack.z = obstacleBox.min.z - (playerBox.max.z - playerBox.min.z) / 2 - this.data.pushBackDistance;
                    }
                }
            }
            
            return pushBack;
        }
    });
})();