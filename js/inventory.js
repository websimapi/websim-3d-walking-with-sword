import { controls } from './controls.js';
import { swordInventory, selectedSwordIndex, equipSword, generateNewSword, setSelectedSwordIndex } from './sword.js';

export function initInventorySystem(controls) {
    // UI elements
    const inventoryContainer = document.getElementById('inventory-container');
    const regenerateInventoryBtn = document.getElementById('regenerate-inventory-btn');
    const equipButton = document.getElementById('equip-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    
    // Handle regenerate from inventory
    regenerateInventoryBtn.addEventListener('click', function() {
        generateNewSword();
    });
    
    // Handle equip button
    equipButton.addEventListener('click', function() {
        if (selectedSwordIndex >= 0 && selectedSwordIndex < swordInventory.length) {
            equipSword(selectedSwordIndex);
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
    swordGridElement.innerHTML = '';
    
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
}

export function selectSword(index) {
    // Fix: Using the setter function instead of trying to modify the module property directly
    setSelectedSwordIndex(index);
    updateInventoryUI();
}