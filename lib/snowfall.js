AFRAME.registerComponent('snowfall', {
  schema: {
    count: { type: 'int', default: 1000 },         // Кол-во снежинок
    area: { type: 'vec2', default: { x: 80, y: 80 } }, // Область по X,Z
    height: { type: 'number', default: 25 },       // Высота появления
    fallSpeed: { type: 'number', default: 1 },     // Средняя скорость падения
    spread: { type: 'number', default: 0.5 },      // Разброс скорости
    size: { type: 'number', default: 0.1 },        // Размер снежинки
    color: { type: 'color', default: '#ffffff' }   // Цвет
  },

  init: function () {
    const scene = this.el.sceneEl;
    const data = this.data;
    this.flakes = [];

    for (let i = 0; i < data.count; i++) {
      const flake = document.createElement('a-entity');

      // — Минимальная геометрия: квадратная плоскость —
      flake.setAttribute('geometry', {
        primitive: 'plane',
        width: data.size,
        height: data.size
      });
      flake.setAttribute('material', {
        color: data.color,
        transparent: false,
        side: 'double'
      });

      // — Случайная начальная позиция —
      const x = (Math.random() - 0.5) * data.area.x;
      const y = Math.random() * data.height;
      const z = (Math.random() - 0.5) * data.area.y;
      flake.setAttribute('position', { x, y, z });

      // — Индивидуальные параметры движения —
      flake.userData = {
        speed: data.fallSpeed * (0.5 + Math.random() * data.spread),
        driftX: (Math.random() - 0.5) * 0.05,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        rotY: Math.random() * Math.PI * 2
      };

      // — Добавляем снежинку в сцену и массив —
      scene.appendChild(flake);
      this.flakes.push(flake);
    }
  },

  tick: function (time, delta) {
    const dt = delta / 1000;
    const data = this.data;

    for (let i = 0; i < this.flakes.length; i++) {
      const flake = this.flakes[i];
      const pos = flake.object3D.position;
      const user = flake.userData;

      // — Движение вниз и дрейф по X —
      pos.y -= user.speed * dt;
      pos.x += user.driftX * dt;

      // — Простое вращение вокруг оси Y —
      user.rotY += user.rotSpeed;
      flake.object3D.rotation.set(0, user.rotY, 0);

      // — Переспаун сверху, если снежинка упала —
      if (pos.y < 0) {
        pos.y = data.height;
        pos.x = (Math.random() - 0.5) * data.area.x;
        pos.z = (Math.random() - 0.5) * data.area.y;
      }
    }
  }
});

