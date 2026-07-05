// Professional Crystal Background Animation
class CrystalBackground {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.crystals = [];
        this.animationId = null;
        this.time = 0;
        
        this.init();
    }
    
    init() {
        const canvas = document.getElementById('background-canvas');
        if (!canvas) return;
        
        // Scene setup with scientific gradient background
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020617, 0.0008);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x020617, 1);
        
        // Professional lighting setup
        this.setupLighting();
        
        // Create crystal structures
        this.createCrystalClusters();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation
        this.animate();
    }
    
    setupLighting() {
        // Soft ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main point lights for highlights with more intensity
        const pointLight1 = new THREE.PointLight(0x00ffff, 1.2, 120);
        pointLight1.position.set(40, 30, 40);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x0080ff, 1.0, 120);
        pointLight2.position.set(-40, -30, -40);
        this.scene.add(pointLight2);
        
        // Additional cyan lights for more visibility
        const pointLight3 = new THREE.PointLight(0x00ffff, 0.8, 100);
        pointLight3.position.set(0, -40, 30);
        this.scene.add(pointLight3);
        
        const pointLight4 = new THREE.PointLight(0x00ccff, 0.6, 100);
        pointLight4.position.set(30, -20, 0);
        this.scene.add(pointLight4);
        
        // Soft directional light for depth
        const directionalLight = new THREE.DirectionalLight(0x11183f, 0.3);
        directionalLight.position.set(15, 15, 10);
        this.scene.add(directionalLight);
        
        // Add animated lights for dynamic effect
        this.animatedLights = [];
        for (let i = 0; i < 3; i++) {
            const light = new THREE.PointLight(0x00ffff, 0.3, 80);
            light.position.set(
                Math.cos(i * Math.PI * 2 / 3) * 50,
                Math.sin(Date.now() * 0.001 + i) * 20,
                Math.sin(i * Math.PI * 2 / 3) * 50
            );
            this.scene.add(light);
            this.animatedLights.push(light);
        }
    }
    
    createCrystalClusters() {
        const clusterCount = 50; // Create 50 crystal clusters for more visual impact
        
        for (let i = 0; i < clusterCount; i++) {
            const type = Math.floor(Math.random() * 4); // 0: octahedral, 1: diamond, 2: hexagonal, 3: complex
            const depth = Math.random() * 80 + 10; // Depth from camera
            
            this.createCrystalCluster(type, depth);
        }
    }
    
    createCrystalCluster(type, depth) {
        const group = new THREE.Group();
        
        // Position crystals in a spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 40 + Math.random() * 30;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        group.position.set(x, y, z);
        
        // Scale based on depth (farther = smaller)
        const scale = 0.3 + (depth / 80) * 0.4;
        
        // Create different crystal structures
        switch(type) {
            case 0:
                this.createOctahedralCrystal(group, scale);
                break;
            case 1:
                this.createDiamondCrystal(group, scale);
                break;
            case 2:
                this.createHexagonalCrystal(group, scale);
                break;
            case 3:
                this.createComplexCrystal(group, scale);
                break;
        }
        
        // Set animation properties
        group.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.002, // Very slow rotation
                y: (Math.random() - 0.5) * 0.003,
                z: (Math.random() - 0.5) * 0.001
            },
            floatPhase: Math.random() * Math.PI * 2,
            floatSpeed: 0.0005 + Math.random() * 0.001,
            floatRadius: 2 + Math.random() * 3,
            initialPosition: group.position.clone(),
            depth: depth
        };
        
        // Set opacity based on depth
        const opacity = 0.3 + (1 - depth / 80) * 0.4;
        group.traverse((child) => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = opacity;
            }
        });
        
        this.scene.add(group);
        this.crystals.push(group);
    }
    
    createOctahedralCrystal(group, scale) {
        const atomGeometry = new THREE.SphereGeometry(0.3, 12, 12);
        const bondGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        
        const atomMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.1,
            shininess: 100,
            transparent: true
        });
        
        const bondMaterial = new THREE.MeshPhongMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.05,
            shininess: 100,
            transparent: true
        });
        
        // Octahedral vertices
        const vertices = [
            [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
        ];
        
        const atoms = [];
        
        // Create atoms
        vertices.forEach((pos, index) => {
            const atom = new THREE.Mesh(atomGeometry, atomMaterial.clone());
            atom.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
            group.add(atom);
            atoms.push(atom);
        });
        
        // Create bonds
        const bonds = [
            [0, 2], [0, 3], [0, 4], [0, 5],
            [1, 2], [1, 3], [1, 4], [1, 5],
            [2, 4], [2, 5], [3, 4], [3, 5]
        ];
        
        bonds.forEach(bond => {
            const pos1 = vertices[bond[0]];
            const pos2 = vertices[bond[1]];
            
            const bondMesh = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            const midX = (pos1[0] + pos2[0]) / 2 * scale;
            const midY = (pos1[1] + pos2[1]) / 2 * scale;
            const midZ = (pos1[2] + pos2[2]) / 2 * scale;
            
            bondMesh.position.set(midX, midY, midZ);
            
            const direction = new THREE.Vector3(
                pos2[0] - pos1[0],
                pos2[1] - pos1[1],
                pos2[2] - pos1[2]
            ).normalize();
            
            bondMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            bondMesh.scale.set(scale, scale, scale);
            
            group.add(bondMesh);
        });
    }
    
    createDiamondCrystal(group, scale) {
        const atomGeometry = new THREE.SphereGeometry(0.25, 12, 12);
        const bondGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
        
        const atomMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.08,
            shininess: 100,
            transparent: true
        });
        
        const bondMaterial = new THREE.MeshPhongMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.04,
            shininess: 100,
            transparent: true
        });
        
        // Diamond cubic structure
        const vertices = [
            [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
            [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
        ];
        
        const atoms = [];
        
        // Create atoms
        vertices.forEach((pos, index) => {
            const atom = new THREE.Mesh(atomGeometry, atomMaterial.clone());
            atom.position.set(pos[0] * scale * 2, pos[1] * scale * 2, pos[2] * scale * 2);
            group.add(atom);
            atoms.push(atom);
        });
        
        // Create bonds for diamond structure
        const bonds = [
            [0, 1], [0, 2], [0, 3], [0, 4],
            [1, 5], [1, 6], [2, 5], [2, 7],
            [3, 6], [3, 7], [4, 5], [4, 6], [4, 7],
            [5, 6], [5, 7], [6, 7]
        ];
        
        bonds.forEach(bond => {
            const pos1 = vertices[bond[0]];
            const pos2 = vertices[bond[1]];
            
            const bondMesh = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            const midX = (pos1[0] + pos2[0]) / 2 * scale * 2;
            const midY = (pos1[1] + pos2[1]) / 2 * scale * 2;
            const midZ = (pos1[2] + pos2[2]) / 2 * scale * 2;
            
            bondMesh.position.set(midX, midY, midZ);
            
            const direction = new THREE.Vector3(
                pos2[0] - pos1[0],
                pos2[1] - pos1[1],
                pos2[2] - pos1[2]
            ).normalize();
            
            bondMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            bondMesh.scale.set(scale, scale, scale);
            
            group.add(bondMesh);
        });
    }
    
    createHexagonalCrystal(group, scale) {
        const atomGeometry = new THREE.SphereGeometry(0.2, 10, 10);
        const bondGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
        
        const atomMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.06,
            shininess: 100,
            transparent: true
        });
        
        const bondMaterial = new THREE.MeshPhongMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.03,
            shininess: 100,
            transparent: true
        });
        
        // Hexagonal structure
        const hexRadius = scale;
        const height = scale * 1.5;
        
        // Create hexagonal layers
        for (let layer = -1; layer <= 1; layer++) {
            const layerY = layer * height / 2;
            
            // Create hexagon atoms
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * hexRadius;
                const z = Math.sin(angle) * hexRadius;
                
                const atom = new THREE.Mesh(atomGeometry, atomMaterial.clone());
                atom.position.set(x, layerY, z);
                group.add(atom);
            }
            
            // Center atom
            const centerAtom = new THREE.Mesh(atomGeometry, atomMaterial.clone());
            centerAtom.position.set(0, layerY, 0);
            group.add(centerAtom);
        }
        
        // Create bonds between layers
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * hexRadius;
            const z = Math.sin(angle) * hexRadius;
            
            // Vertical bonds
            const bond1 = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            bond1.position.set(x, -height / 4, z);
            bond1.rotation.x = Math.PI / 2;
            bond1.scale.set(scale, scale, scale);
            group.add(bond1);
            
            const bond2 = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            bond2.position.set(x, height / 4, z);
            bond2.rotation.x = Math.PI / 2;
            bond2.scale.set(scale, scale, scale);
            group.add(bond2);
        }
    }
    
    createComplexCrystal(group, scale) {
        const atomGeometry = new THREE.SphereGeometry(0.15, 10, 10);
        const bondGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
        
        const atomMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.05,
            shininess: 100,
            transparent: true
        });
        
        const bondMaterial = new THREE.MeshPhongMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.02,
            shininess: 100,
            transparent: true
        });
        
        // Create a complex interconnected structure
        const positions = [
            [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
            [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75],
            [0.3, 0.3, 0], [0.7, 0.7, 0], [0.5, 0, 0.3], [0.5, 0, 0.7]
        ];
        
        // Create atoms
        positions.forEach((pos, index) => {
            const atom = new THREE.Mesh(atomGeometry, atomMaterial.clone());
            atom.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
            group.add(atom);
        });
        
        // Create complex bond network
        const bonds = [
            [0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1],
            [0, 4], [1, 5], [2, 6], [3, 7],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 8], [1, 9], [2, 10], [3, 11],
            [8, 9], [9, 10], [10, 11], [11, 8]
        ];
        
        bonds.forEach(bond => {
            const pos1 = positions[bond[0]];
            const pos2 = positions[bond[1]];
            
            const bondMesh = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            const midX = (pos1[0] + pos2[0]) / 2 * scale;
            const midY = (pos1[1] + pos2[1]) / 2 * scale;
            const midZ = (pos1[2] + pos2[2]) / 2 * scale;
            
            bondMesh.position.set(midX, midY, midZ);
            
            const direction = new THREE.Vector3(
                pos2[0] - pos1[0],
                pos2[1] - pos1[1],
                pos2[2] - pos1[2]
            ).normalize();
            
            bondMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            bondMesh.scale.set(scale, scale, scale);
            
            group.add(bondMesh);
        });
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        
        // Animate lights for dynamic effect
        if (this.animatedLights) {
            this.animatedLights.forEach((light, i) => {
                light.position.x = Math.cos(i * Math.PI * 2 / 3) * 50;
                light.position.y = Math.sin(this.time * 0.001 + i) * 20;
                light.position.z = Math.sin(i * Math.PI * 2 / 3) * 50;
                light.intensity = 0.3 + Math.sin(this.time * 0.002 + i) * 0.2;
            });
        }
        
        // Smooth, elegant crystal movement
        this.crystals.forEach((crystal, index) => {
            const userData = crystal.userData;
            
            // Very slow rotation
            crystal.rotation.x += userData.rotationSpeed.x;
            crystal.rotation.y += userData.rotationSpeed.y;
            crystal.rotation.z += userData.rotationSpeed.z;
            
            // Gentle floating motion
            const floatX = Math.sin(this.time * userData.floatSpeed + userData.floatPhase) * userData.floatRadius;
            const floatY = Math.cos(this.time * userData.floatSpeed * 0.7 + userData.floatPhase) * userData.floatRadius * 0.5;
            const floatZ = Math.sin(this.time * userData.floatSpeed * 0.3 + userData.floatPhase) * userData.floatRadius * 0.3;
            
            crystal.position.x = userData.initialPosition.x + floatX;
            crystal.position.y = userData.initialPosition.y + floatY;
            crystal.position.z = userData.initialPosition.z + floatZ;
            
            // Pulsing glow effect based on depth
            const pulseFactor = Math.sin(this.time * 0.003 + userData.floatPhase) * 0.1 + 0.9;
            crystal.traverse((child) => {
                if (child.material && child.material.emissive) {
                    child.material.emissiveIntensity = child.material.emissiveIntensity * pulseFactor;
                }
            });
        });
        
        // Very slow camera drift
        this.camera.position.x = Math.sin(this.time * 0.05) * 3;
        this.camera.position.y = Math.cos(this.time * 0.03) * 2;
        this.camera.lookAt(0, 0, 0);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize crystal background when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.crystalBackground = new CrystalBackground();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.crystalBackground) {
        window.crystalBackground.destroy();
    }
});
