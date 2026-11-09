import * as THREE from 'three';

export class ThreeShowroom {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private bottleGroup: THREE.Group;
  private liquidMesh: THREE.Mesh;
  private particlesGroup: THREE.Group;
  private animationId: number | null = null;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private autoRotate = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0.25, 1.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.bottleGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();
    this.liquidMesh = new THREE.Mesh();

    this.setupLights();
    this.buildLuxuryBottle();
    this.buildPedestal();
    this.setupInteractions();
    this.animate();

    window.addEventListener('resize', this.onResize);
  }

  private setupLights() {
    // Luz ambiental suave cálida
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.2);
    this.scene.add(ambientLight);

    // Luz principal de estudio (Key light)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    keyLight.position.set(2, 3, 3);
    this.scene.add(keyLight);

    // Luz de recorte (Rim light) para resaltar el vidrio ámbar
    const rimLight = new THREE.DirectionalLight(0xfef08a, 2.2);
    rimLight.position.set(-3, 2, -2);
    this.scene.add(rimLight);

    // Luz inferior suave para reflejos
    const bounceLight = new THREE.DirectionalLight(0xe7e5e4, 0.8);
    bounceLight.position.set(0, -2, 1);
    this.scene.add(bounceLight);
  }

  private buildLuxuryBottle() {
    this.bottleGroup = new THREE.Group();

    // 1. Vidrio Ámbar de Lujo (Cuerpo de la botella)
    const glassGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.44, 48);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x92400e, // Ámbar rico
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.88,
      ior: 1.52,
    });
    const glassBody = new THREE.Mesh(glassGeometry, glassMaterial);
    glassBody.position.y = 0.22;
    this.bottleGroup.add(glassBody);

    // Hombros redondeados de la botella
    const shoulderGeometry = new THREE.SphereGeometry(0.18, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const shoulder = new THREE.Mesh(shoulderGeometry, glassMaterial);
    shoulder.position.y = 0.44;
    shoulder.scale.set(1, 0.4, 1);
    this.bottleGroup.add(shoulder);

    // 2. Líquido Perfumado interno (Golden essence)
    const liquidGeometry = new THREE.CylinderGeometry(0.165, 0.165, 0.36, 32);
    const liquidMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    this.liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial);
    this.liquidMesh.position.y = 0.19;
    this.bottleGroup.add(this.liquidMesh);

    // 3. Etiqueta Minimalista de Papel Artesanal
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 1024;
    labelCanvas.height = 512;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      // Fondo crema cálido
      ctx.fillStyle = '#FDFCF7';
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);

      // Marco dorado sutil
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, labelCanvas.width - 60, labelCanvas.height - 60);

      // Tipografía AROMASS
      ctx.fillStyle = '#1C1917';
      ctx.font = 'bold 64px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('AROMASS', labelCanvas.width / 2, 160);

      ctx.font = '500 32px sans-serif';
      ctx.fillStyle = '#78350F';
      ctx.fillText('FRAGANCIAS AMBIENTALES', labelCanvas.width / 2, 220);

      ctx.fillStyle = '#44403C';
      ctx.font = 'italic 36px serif';
      ctx.fillText('Sándalo Real & Ámbar', labelCanvas.width / 2, 310);

      ctx.fillStyle = '#78716C';
      ctx.font = '28px monospace';
      ctx.fillText('250 ml · Edición de Campaña', labelCanvas.width / 2, 400);
    }

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelGeometry = new THREE.CylinderGeometry(0.182, 0.182, 0.26, 48, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.y = 0.22;
    labelMesh.rotation.y = Math.PI / 2;
    this.bottleGroup.add(labelMesh);

    // 4. Cuello y Bomba Dorada
    const neckGeometry = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 32);
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.22,
    });
    const neck = new THREE.Mesh(neckGeometry, goldMaterial);
    neck.position.y = 0.53;
    this.bottleGroup.add(neck);

    // Gatillo / Atomizador negro satinado
    const sprayGeometry = new THREE.CylinderGeometry(0.05, 0.055, 0.1, 32);
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.2,
      roughness: 0.4,
    });
    const sprayNozzle = new THREE.Mesh(sprayGeometry, blackMat);
    sprayNozzle.position.y = 0.61;
    this.bottleGroup.add(sprayNozzle);

    // Boquilla dispensadora
    const tipGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 16);
    tipGeo.rotateZ(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, goldMaterial);
    tip.position.set(0.05, 0.63, 0);
    this.bottleGroup.add(tip);

    // Posición general
    this.bottleGroup.position.set(0, -0.18, 0);
    this.scene.add(this.bottleGroup);
    this.scene.add(this.particlesGroup);
  }

  private buildPedestal() {
    // Pedestal de piedra travertino cálida
    const pedestalGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.06, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      roughness: 0.75,
      metalness: 0.05,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.21, 0);
    this.scene.add(pedestal);
  }

  public triggerSpray() {
    // Crear partículas de bruma aromática
    const particleCount = 45;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0.05;
      positions[i * 3 + 1] = 0.45;
      positions[i * 3 + 2] = 0;

      const angle = (Math.random() - 0.5) * 0.4;
      const speed = 0.8 + Math.random() * 0.9;
      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          0.2 + (Math.random() - 0.5) * 0.3,
          Math.sin(angle) * speed * 0.4
        )
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.025,
      transparent: true,
      opacity: 0.9,
    });

    const pSystem = new THREE.Points(geo, mat);
    this.particlesGroup.add(pSystem);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      const posAttr = pSystem.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        array[i * 3] += velocities[i].x * 0.02;
        array[i * 3 + 1] += velocities[i].y * 0.02;
        array[i * 3 + 2] += velocities[i].z * 0.02;
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 0.9 - progress * 1.2);

      if (progress >= 1) {
        clearInterval(interval);
        this.particlesGroup.remove(pSystem);
        geo.dispose();
        mat.dispose();
      }
    }, 25);
  }

  private setupInteractions() {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.bottleGroup.rotation.y += deltaX * 0.008;
      this.camera.position.y = THREE.MathUtils.clamp(
        this.camera.position.y + deltaY * 0.003,
        0.05,
        0.5
      );

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support for mobile phones
    el.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.autoRotate = false;
          this.previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this.isDragging || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.bottleGroup.rotation.y += deltaX * 0.01;
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      },
      { passive: true }
    );

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.autoRotate && !this.isDragging) {
      this.bottleGroup.rotation.y += 0.006;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setBottleType(type: 'spray' | 'diffuser' | 'refill') {
    // Personalizar el aspecto según la categoría seleccionada
    if (type === 'diffuser') {
      this.liquidMesh.scale.set(1.1, 0.7, 1.1);
      this.bottleGroup.scale.set(0.95, 0.85, 0.95);
    } else if (type === 'refill') {
      this.liquidMesh.scale.set(0.9, 1.1, 0.9);
      this.bottleGroup.scale.set(0.85, 1.1, 0.85);
    } else {
      this.liquidMesh.scale.set(1, 1, 1);
      this.bottleGroup.scale.set(1, 1, 1);
    }
  }

  public dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
