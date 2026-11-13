import Phaser from 'phaser';
import { W, H } from './config.js';
import { BootScene } from './scenes/Boot.js';
import { TitleScene } from './scenes/Title.js';
import { RideScene } from './scenes/Ride.js';
import { DialogueScene } from './scenes/Dialogue.js';
import { EndScene } from './scenes/End.js';
import { unlockAudio, toggleMute } from './systems/audio.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0e1016',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, RideScene, DialogueScene, EndScene],
});

// Le son ne peut démarrer qu'après un geste du joueur. M coupe ou remet le son.
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.code === 'KeyM') toggleMute();
});

// Pratique pour déboguer dans la console du navigateur.
window.__game = game;
