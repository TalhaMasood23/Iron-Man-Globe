import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { DrawingUtils } from '@mediapipe/drawing_utils';
import * as THREE from 'three';
import './App.css';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const threeContainerRef = useRef(null);
  const statusRef = useRef(null);
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereRef = useRef(null);
  const solidMeshRef = useRef(null);
  const wireframeMeshRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [handStatus, setHandStatus] = useState('Loading MediaPipe...');
  const lastColorChangeTimeRef = useRef(0);
  const colorChangeDelay = 500;
  const currentSphereSizeRef = useRef(1.0);
  const targetSphereSizeRef = useRef(1.0);
  const smoothingFactor = 0.15;
  
  const getRandomNeonColor = useCallback(() => {
    const neonColors = [
      0xFF00FF,
      0x00FFFF,
      0xFF3300,
      0x39FF14,
      0xFF0099,
      0x00FF00,
      0xFF6600,
      0xFFFF00
    ];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
  }, []);

  const updateCanvasSize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  const initializeLayout = useCallback(() => {
    updateCanvasSize();
  }, [updateCanvasSize]);

  const calculateDistance = useCallback((point1, point2) => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, []);

  const isPointInSphere = useCallback((point) => {
    if (!sphereRef.current) return false;
    
    const worldX = (point.x - 0.5) * 10;
    const worldY = (0.5 - point.y) * 10;
    const worldZ = 0;
    
    const spherePos = new THREE.Vector3();
    sphereRef.current.getWorldPosition(spherePos);
    
    const distance = Math.sqrt(
      Math.pow(worldX - spherePos.x, 2) + 
      Math.pow(worldY - spherePos.y, 2) + 
      Math.pow(worldZ - spherePos.z, 2)
    );
    
    const currentSize = sphereRef.current.scale.x * 2;
    return distance < currentSize * 1;
  }, []);

  const drawLandmarks = useCallback((canvasCtx, landmarks, isLeft) => {
    if (!canvasRef.current) return;
    
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    const lineWidth = Math.max(2, Math.min(5, screenSize / 300));
    const pointSize = Math.max(2, Math.min(8, screenSize / 250));
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [0, 5], [5, 9], [9, 13], [13, 17]
    ];
    
    const handColor = isLeft ? '#00FF00' : '#00FFFF';
    
    canvasCtx.lineWidth = lineWidth;
    canvasCtx.strokeStyle = handColor;
    
    connections.forEach(([i, j]) => {
      const start = landmarks[i];
      const end = landmarks[j];
      
      canvasCtx.beginPath();
      canvasCtx.moveTo(start.x * canvasRef.current.width, start.y * canvasRef.current.height);
      canvasCtx.lineTo(end.x * canvasRef.current.width, end.y * canvasRef.current.height);
      canvasCtx.stroke();
    });
    
    landmarks.forEach((landmark, index) => {
      let pointColor = handColor;
      if (index === 4 || index === 8) {
        pointColor = '#FF0000';
      }
      
      canvasCtx.fillStyle = pointColor;
      canvasCtx.beginPath();
      canvasCtx.arc(
        landmark.x * canvasRef.current.width,
        landmark.y * canvasRef.current.height,
        pointSize * 1.2,
        0,
        2 * Math.PI
      );
      canvasCtx.fill();
    });
  }, []);

  const onResults = useCallback((results) => {
    if (!canvasRef.current) return;
    
    const canvasCtx = canvasRef.current.getContext('2d');
    
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (canvasRef.current.width !== window.innerWidth || 
        canvasRef.current.height !== window.innerHeight) {
      updateCanvasSize();
    }
    
    let rightHandActive = false;
    let leftHandActive = false;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const handCount = results.multiHandLandmarks.length;
      setHandStatus(handCount === 1 ? '1 hand detected' : `${handCount} hands detected`);
      
      for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
        const landmarks = results.multiHandLandmarks[handIndex];
        const handedness = results.multiHandedness[handIndex].label;
        const isLeftHand = handedness === 'Left';
        
        drawLandmarks(canvasCtx, landmarks, isLeftHand);
        
        if (!isLeftHand) {
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          
          const pinchDistance = calculateDistance(thumbTip, indexTip);
          
          if (pinchDistance < 0.05) {
            targetSphereSizeRef.current = 0.2;
          } else if (pinchDistance > 0.25) {
            targetSphereSizeRef.current = 2.0;
          } else {
            targetSphereSizeRef.current = 0.2 + (pinchDistance - 0.05) * (2.0 - 0.2) / (0.25 - 0.05);
          }
          
          currentSphereSizeRef.current = currentSphereSizeRef.current + 
            (targetSphereSizeRef.current - currentSphereSizeRef.current) * smoothingFactor;
          
          if (sphereRef.current) {
            sphereRef.current.scale.set(
              currentSphereSizeRef.current, 
              currentSphereSizeRef.current, 
              currentSphereSizeRef.current
            );
          }
          
          rightHandActive = true;
        } else {
          const indexTip = landmarks[8];
          
          if (isPointInSphere(indexTip)) {
            const currentTime = Date.now();
            if (currentTime - lastColorChangeTimeRef.current > colorChangeDelay) {
              const newColor = getRandomNeonColor();
              if (solidMeshRef.current && solidMeshRef.current.material) {
                solidMeshRef.current.material.color.setHex(newColor);
              }
              lastColorChangeTimeRef.current = currentTime;
            }
            
            leftHandActive = true;
          }
        }
      }
    } else {
      setHandStatus('No hands detected');
    }
  }, [calculateDistance, drawLandmarks, getRandomNeonColor, isPointInSphere, updateCanvasSize]);

  const initThreeJS = useCallback(() => {
    if (!threeContainerRef.current) return;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    while (threeContainerRef.current.firstChild) {
      threeContainerRef.current.removeChild(threeContainerRef.current.firstChild);
    }
    
    threeContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    
    const sphere = new THREE.Group();
    
    const solidMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff00ff,
      transparent: true,
      opacity: 0.5
    });
    const solidMesh = new THREE.Mesh(geometry, solidMaterial);
    sphere.add(solidMesh);
    
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: false,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    sphere.add(wireframeMesh);
    scene.add(sphere);
    
    sphereRef.current = sphere;
    solidMeshRef.current = solidMesh;
    wireframeMeshRef.current = wireframeMesh;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (sphere) {
        sphere.rotation.x += 0.003;
        sphere.rotation.y += 0.008;
        
        const time = Date.now() * 0.001;
        const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
        
        if (solidMesh && solidMesh.material) {
          solidMesh.material.opacity = 0.4 + 0.1 * pulseIntensity;
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
  }, []);

  const initWebcam = useCallback(async () => {
    try {
      if (!webcamRef.current) return null;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        }
      });
      
      webcamRef.current.srcObject = stream;
      
      return new Promise((resolve) => {
        webcamRef.current.onloadedmetadata = () => {
          initializeLayout();
          resolve(webcamRef.current);
        };
      });
    } catch (error) {
      setHandStatus(`Error accessing webcam: ${error.message}`);
      console.error('Error accessing webcam:', error);
      throw error;
    }
  }, [initializeLayout]);

  const initMediaPipeHands = useCallback(async () => {
    setHandStatus('Initializing MediaPipe Hands...');
    
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    await hands.initialize();
    setHandStatus('Hand tracking ready!');
    
    return hands;
  }, []);

  const startApp = useCallback(async () => {
    try {
      await initWebcam();
      initThreeJS();
      const hands = await initMediaPipeHands();
      
      hands.onResults(onResults);
      
      if (webcamRef.current) {
        const camera = new Camera(webcamRef.current, {
          onFrame: async () => {
            await hands.send({image: webcamRef.current});
          },
          width: 1920,
          height: 1080
        });
        
        camera.start();
      }
    } catch (error) {
      setHandStatus(`Error: ${error.message}`);
      console.error('Error starting application:', error);
    }
  }, [initMediaPipeHands, initThreeJS, initWebcam, onResults]);

  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
      if (rendererRef.current) {
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
      if (cameraRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    startApp();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startApp]);

  return (
    <div className="container">
      <video 
        ref={webcamRef} 
        id="webcam" 
        autoPlay 
        playsInline
      />
      <canvas 
        ref={canvasRef} 
        id="canvas"
      />
      <div 
        ref={threeContainerRef} 
        id="three-canvas"
      />
      <div 
        ref={statusRef} 
        id="status"
      >
        {handStatus}
      </div>
      
      <p id="links-para">
        <a href="https://x.com/imdigitalashi" target="_blank" rel="noreferrer">Twitter</a> | 
        <a href="https://www.instagram.com/imdigitalashi/" target="_blank" rel="noreferrer">Instagram</a> | 
      </p>
    </div>
  );
}

export default App;