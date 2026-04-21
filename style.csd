body {
    background-color: #f5f5f7;
    color: #1d1d1f;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

main {
    flex-grow: 1;
}

.page-section {
    display: none;
    min-height: auto;
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

.page-section.active-page {
    display: block;
}

.page-section.fade-in {
    opacity: 1;
    transform: translateY(0);
}

.liquid-bg {
    background: linear-gradient(45deg, #e0eafc, #cfdef3, #e0eafc);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.glass-nav {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.glass-card {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

#cart-drawer {
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#cart-drawer.open {
    transform: translateX(0);
}

#auth-modal,
#policy-modal,
#pwa-modal,
#checkout-modal,
#review-modal,
#msg-modal,
#order-details-modal,
#edit-profile-modal {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
}

.custom-scroll::-webkit-scrollbar {
    width: 4px;
}

.custom-scroll::-webkit-scrollbar-thumb {
    background: #0071e3;
    border-radius: 10px;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

#global-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    transition: opacity 0.5s ease;
    overflow: hidden;
}

.loader-container {
    width: 200px;
    height: 200px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: auto;
    filter: url("#goo");
    animation: rotate-move 2s ease-in-out infinite;
}

.dot {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: #000;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
}

.dot-3 {
    background-color: #ff1717;
    animation: dot-3-move 2s ease infinite, index 6s ease infinite;
}

.dot-2 {
    background-color: #0051ff;
    animation: dot-2-move 2s ease infinite, index 6s -4s ease infinite;
}

.dot-1 {
    background-color: #ffc400;
    animation: dot-1-move 2s ease infinite, index 6s -2s ease infinite;
}

@keyframes dot-3-move {
    20% { transform: scale(1); }
    45% { transform: translateY(-18px) scale(0.45); }
    60% { transform: translateY(-90px) scale(0.45); }
    80% { transform: translateY(-90px) scale(0.45); }
    100% { transform: translateY(0px) scale(1); }
}

@keyframes dot-2-move {
    20% { transform: scale(1); }
    45% { transform: translate(-16px, 12px) scale(0.45); }
    60% { transform: translate(-80px, 60px) scale(0.45); }
    80% { transform: translate(-80px, 60px) scale(0.45); }
    100% { transform: translateY(0px) scale(1); }
}

@keyframes dot-1-move {
    20% { transform: scale(1); }
    45% { transform: translate(16px, 12px) scale(0.45); }
    60% { transform: translate(80px, 60px) scale(0.45); }
    80% { transform: translate(80px, 60px) scale(0.45); }
    100% { transform: translateY(0px) scale(1); }
}

@keyframes rotate-move {
    55% { transform: translate(-50%, -50%) rotate(0deg); }
    80% { transform: translate(-50%, -50%) rotate(360deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes index {
    0%, 100% { z-index: 3; }
    33.3% { z-index: 2; }
    66.6% { z-index: 1; }
}

.hero-slider-img {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 1s ease-in-out;
}

.hero-slider-img.active {
    opacity: 1;
}

.variant-btn.selected {
    border-color: #0071e3;
    background: #0071e3;
    color: white;
}

#order-loader-overlay {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.truck-loader {
    width: fit-content;
    height: fit-content;
    display: flex;
    align-items: center;
    justify-content: center;
}

.truckWrapper {
    width: 200px;
    height: 100px;
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    justify-content: flex-end;
    overflow-x: hidden;
}

.truckBody {
    width: 130px;
    height: fit-content;
    margin-bottom: 6px;
    animation: motion 1s linear infinite;
}

@keyframes motion {
    0% { transform: translateY(0px); }
    50% { transform: translateY(3px); }
    100% { transform: translateY(0px); }
}

.truckTires {
    width: 130px;
    height: fit-content;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 10px 0px 15px;
    position: absolute;
    bottom: 0;
}

.truckTires svg {
    width: 24px;
}

.road {
    width: 100%;
    height: 1.5px;
    background-color: #282828;
    position: relative;
    bottom: 0;
    align-self: flex-end;
    border-radius: 3px;
}

.road::before {
    content: "";
    position: absolute;
    width: 20px;
    height: 100%;
    background-color: #282828;
    right: -50%;
    border-radius: 3px;
    animation: roadAnimation 1.4s linear infinite;
    border-left: 10px solid white;
}

.road::after {
    content: "";
    position: absolute;
    width: 10px;
    height: 100%;
    background-color: #282828;
    right: -65%;
    border-radius: 3px;
    animation: roadAnimation 1.4s linear infinite;
    border-left: 4px solid white;
}

.lampPost {
    position: absolute;
    bottom: 0;
    right: -90%;
    height: 90px;
    animation: roadAnimation 1.4s linear infinite;
}

@keyframes roadAnimation {
    0% { transform: translateX(0px); }
    100% { transform: translateX(-350px); }
}

.messenger-float {
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 999;
    width: 60px;
    height: 60px;
    background: #0084ff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease;
}

.messenger-float:hover {
    transform: scale(1.1);
}
