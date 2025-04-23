// Main multiplayer module that re-exports functionality from submodules

// Core functionality
export { 
    room, 
    pairedClientId, 
    initMultiplayer, 
    updatePlayerPosition 
} from './multiplayer/core.js';

// Device detection
export { 
    isDesktop, 
    detectDeviceType 
} from './multiplayer/deviceDetection.js';

// Player representation
export { 
    playerEntities,
    handlePresenceUpdate,
    createPlayerRepresentation,
    initPlayerRepresentations,
    applySwordOrientationFromMobile,
    findUnpairedMobileDevices,
    playRemoteSwordSwingEffect
} from './multiplayer/playerRepresentation.js';

// Mobile controls
export { 
    initMobileControls,
    handleDeviceOrientation,
    handleDeviceMotion,
    detectSwordSwing,
    calculateSwordRotationFromGyro,
    requestSensorPermission,
    triggerManualSwordSwing
} from './multiplayer/mobileControls.js';

// Pairing system
export { 
    handlePresenceUpdateRequest,
    findDesktopToPair
} from './multiplayer/pairingSystem.js';

// Message handling
export { 
    handleMessage 
} from './multiplayer/messageHandler.js';

// UI
export { 
    createMobileUI,
    showPairingStatus
} from './multiplayer/ui.js';