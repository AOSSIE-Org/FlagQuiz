// First, so that the early `beforeinstallprompt` event is not missed.
import './lib/install.svelte';
import '@fontsource-variable/inter';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
