AFRAME.registerComponent('path-walker', {
  schema: {
    clip: { type: 'string', default: 'walk' },        // Анимация ходьбы
    idleClip: { type: 'string', default: 'idle' },    // Анимация покоя
    path: { type: 'string', default: '[]' },          // Массив координат в виде строки JSON
    restTime: { type: 'number', default: 2 },         // Время отдыха (сек)
    speed: { type: 'number', default: 1 },            // Скорость движения (ед/сек)
    loop: { type: 'boolean', default: true },         // Повторять путь после отдыха
    lookAt: { type: 'boolean', default: true }        // Поворачиваться к направлению движения
  },

  init: function () {
    const data = this.data;

    // --- Преобразуем path из строки JSON в массив чисел ---
    try {
      this.path = JSON.parse(data.path);
      if (!Array.isArray(this.path)) this.path = [];
    } catch (e) {
      console.warn('path-walker: неверный формат path, ожидается JSON-массив координат');
      this.path = [];
    }

    this.currentPoint = 0;
    this.isMoving = false;

    // --- Для моделей ждём событие загрузки ---
    this.el.addEventListener('model-loaded', () => this.startPath());

    // --- Для примитивов запускаем сразу ---
    if (!this.el.components['gltf-model']) {
      this.startPath();
    }
  },

  // --- Запуск пути ---
  startPath: function () {
    if (this.path.length < 2) return;
    this.currentPoint = 0;
    this.moveToNextPoint();
  },

  // --- Движение к следующей точке ---
  moveToNextPoint: function () {
    const data = this.data;
    const path = this.path;

    if (this.currentPoint >= path.length - 1) {
      this.playIdle();
      return;
    }

    const from = new THREE.Vector3(...path[this.currentPoint]);
    const to = new THREE.Vector3(...path[this.currentPoint + 1]);

    // Проверяем координаты на корректность
    if ([from.x, from.y, from.z, to.x, to.y, to.z].some(isNaN)) {
      console.warn('path-walker: некорректные координаты в path');
      return;
    }

    const distance = from.distanceTo(to);
    const duration = (distance / data.speed) * 1000;

    // Проигрываем анимацию ходьбы
    this.el.setAttribute('animation-mixer', { clip: data.clip, loop: 'repeat' });

    // Поворачиваем к следующей точке
    if (data.lookAt) {
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      const yaw = Math.atan2(dir.x, dir.z);
      this.el.object3D.rotation.y = yaw;
    }

    // Анимация перемещения
    this.el.setAttribute('animation__move', {
      property: 'position',
      from: `${from.x} ${from.y} ${from.z}`,
      to: `${to.x} ${to.y} ${to.z}`,
      dur: duration,
      easing: 'linear'
    });

    setTimeout(() => {
      this.currentPoint++;
      this.moveToNextPoint();
    }, duration);
  },

  // --- Проигрывание анимации покоя ---
  playIdle: function () {
    const data = this.data;

    this.isMoving = false;
    this.el.setAttribute('animation-mixer', { clip: data.idleClip, loop: 'repeat' });

    if (data.loop) {
      setTimeout(() => {
        this.startPath();
      }, data.restTime * 1000);
    }
  }
});
