// Detect if the device is mobile or desktop
export let isDesktop = true;

export function detectDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check for mobile device
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
        isDesktop = false;
        document.body.classList.add('mobile-device');
        return 'mobile';
    } else {
        isDesktop = true;
        document.body.classList.add('desktop-device');
        return 'desktop';
    }
}

