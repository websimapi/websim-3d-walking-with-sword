import { controls } from './controls.js';
import { 
    swordInventory, 
    selectedSwordIndex, 
    equipSword, 
    generateNewSword, 
    setSelectedSwordIndex,
    armInventory,
    selectedArmIndex,
    equipArm,
    generateNewArm,
    setSelectedArmIndex 
} from './sword.js';

export function initInventorySystem(controls) {
    // UI elements
    const inventoryContainer = document.getElementById('inventory-container');
    const regenerateInventoryBtn = document.getElementById('regenerate-inventory-btn');
    const equipButton = document.getElementById('equip-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    const generateArmBtn = document.getElementById('generate-arm-btn');
    
    // Handle regenerate from inventory
    regenerateInventoryBtn.addEventListener('click', function() {
        generateNewSword();
    });
    
    // Handle generate new arm button
    generateArmBtn.addEventListener('click', function() {
        generateNewArm();
    });
    
    // Handle equip button
    equipButton.addEventListener('click', function() {
        // Check if we have a sword selected
        if (selectedSwordIndex >= 0 && selectedSwordIndex < swordInventory.length) {
            equipSword(selectedSwordIndex);
            closeInventory();
        } 
        // Check if we have an arm selected
        else if (selectedArmIndex >= 0 && selectedArmIndex < armInventory.length) {
            equipArm(selectedArmIndex);
            closeInventory();
        }
    });
    
    // Handle close inventory button
    closeInventoryBtn.addEventListener('click', closeInventory);
}

export function showInventory() {
    document.getElementById('instructions').style.display = 'none'; // Ensure instructions are hidden
    document.getElementById('inventory-container').style.display = 'flex';
    updateInventoryUI();
}

export function closeInventory() {
    document.getElementById('inventory-container').style.display = 'none';
    // Re-lock controls when closing inventory
    controls.lock();
}

export function updateInventoryUI() {
    const swordGridElement = document.getElementById('sword-grid');
    const armGridElement = document.getElementById('arm-grid');
    
    // Clear existing content
    swordGridElement.innerHTML = '';
    armGridElement.innerHTML = '';
    
    // Update sword inventory
    swordInventory.forEach((sword, index) => {
        const swordItem = document.createElement('div');
        swordItem.className = 'sword-item';
        if (index === selectedSwordIndex) {
            swordItem.classList.add('selected');
        }
        
        const swordImg = document.createElement('img');
        swordImg.className = 'sword-preview';
        swordImg.src = sword.processedUrl;
        swordImg.alt = sword.name;
        
        const swordLabel = document.createElement('div');
        swordLabel.className = 'sword-label';
        swordLabel.textContent = sword.name;
        
        // Rename button
        const renameBtn = document.createElement('button');
        renameBtn.className = 'small-button';
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('Enter new name for this sword:', sword.name);
            if (newName && newName.trim() !== '') {
                sword.name = newName.trim();
                updateInventoryUI();
            }
        });
        
        swordItem.appendChild(swordImg);
        swordItem.appendChild(swordLabel);
        swordItem.appendChild(renameBtn);
        
        swordItem.addEventListener('click', () => {
            selectSword(index);
        });
        
        swordGridElement.appendChild(swordItem);
    });
    
    // Update arm inventory
    armInventory.forEach((arm, index) => {
        const armItem = document.createElement('div');
        armItem.className = 'arm-item';
        if (index === selectedArmIndex) {
            armItem.classList.add('selected');
        }
        
        const armImg = document.createElement('img');
        armImg.className = 'arm-preview';
        armImg.src = arm.processedUrl;
        armImg.alt = arm.name;
        
        const armLabel = document.createElement('div');
        armLabel.className = 'arm-label';
        armLabel.textContent = arm.name;
        
        // Rename button
        const renameBtn = document.createElement('button');
        renameBtn.className = 'small-button';
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('Enter new name for this arm:', arm.name);
            if (newName && newName.trim() !== '') {
                arm.name = newName.trim();
                updateInventoryUI();
            }
        });
        
        armItem.appendChild(armImg);
        armItem.appendChild(armLabel);
        armItem.appendChild(renameBtn);
        
        armItem.addEventListener('click', () => {
            selectArm(index);
        });
        
        armGridElement.appendChild(armItem);
    });
}

export function selectSword(index) {
    // Using the setter function
    setSelectedSwordIndex(index);
    // Clear arm selection when sword is selected
    setSelectedArmIndex(-1);
    updateInventoryUI();
}

export function selectArm(index) {
    // Using the setter function
    setSelectedArmIndex(index);
    // Clear sword selection when arm is selected
    setSelectedSwordIndex(-1);
    updateInventoryUI();
}