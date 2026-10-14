import { markEntered } from './store.js?v=3b50e18461';
document.querySelector('[data-test="enter"]').addEventListener('click', () => { markEntered(); location.href = 'home.html'; });
