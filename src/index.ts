import * as THREE from 'three';
import * as xb from 'xrblocks';
import { MagazineView } from './components/MagazineView.ts';

/**
 * Escena espacial en XR Blocks para dispositivos WebXR / Android XR.
 * Muestra el pedestal de mármol y la botella ámbar de Aromass flotando en el espacio físico.
 */
class SpatialAromassShowroom extends xb.Script {
  bottleGroup?: THREE.Group;
  particles?: THREE.Points;

  init() {
    this.add(new THREE.HemisphereLight(0xfff7ed, 0x44403c, 3));
    const dirLight = new THREE.DirectionalLight(0xfef08a, 2.5);
    dirLight.position.set(1, 3, 2);
    this.add(dirLight);

    // Pedestal y Botella en el espacio del usuario
    this.bottleGroup = new THREE.Group();

    // Vidrio Ámbar
    const glassGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.28, 32);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x92400e,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.y = 0.14;
    this.bottleGroup.add(glassMesh);

    // Cuello dorado
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 24);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const neck = new THREE.Mesh(neckGeo, goldMat);
    neck.position.y = 0.31;
    this.bottleGroup.add(neck);

    // Posición ergonómica a la altura del usuario en XR
    this.bottleGroup.position.set(0, xb.user.height - 0.2, -xb.user.objectDistance);
    this.add(this.bottleGroup);
  }

  update() {
    if (this.bottleGroup) {
      this.bottleGroup.rotation.y += 0.01;
    }
  }

  /**
   * Al hacer pinch en XR, cambia la tonalidad de la esencia e incrementa el brillo.
   */
  onSelectEnd(_event: xb.SelectEvent) {
    if (this.bottleGroup) {
      this.bottleGroup.rotation.y += 0.2;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar la Revista Digital Interactiva en el DOM
  const root = document.getElementById('root');
  if (root) {
    const magazine = new MagazineView(root);
    magazine.init();
  }

  // 2. Inicializar soporte WebXR / XR Blocks en segundo plano
  try {
    const options = new xb.Options();
    options.setAppTitle('AROMASS XR');
    options.setAppDescription('Revista digital y showroom espacial de fragancias.');
    // No superponer botones grandes de XR sobre la experiencia móvil
    if (options.xrButton) {
      options.xrButton.showEnterSimulatorButton = false;
    }
    xb.add(new SpatialAromassShowroom());
    xb.init(options);
  } catch (err) {
    console.warn('WebXR inicializado en modo fallback 2D:', err);
  }
});
