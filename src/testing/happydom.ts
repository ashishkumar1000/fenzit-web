// Registers a DOM (window, document, HTMLElement) for every test file.
// Must run before any React Testing Library import, so it is the first preload.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
