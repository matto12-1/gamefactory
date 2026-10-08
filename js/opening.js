import { markEntered } from './store.js?v=399a5c8957';
document.querySelector('[data-test="enter"]').addEventListener('click', () => { markEntered(); location.href = 'home.html'; });
