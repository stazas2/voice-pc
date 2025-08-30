// Windows Commands через edge-js
const windowsApi = require('./windows-api/base');

class WindowsCommandsEdge {
    static async lockScreen() {
        try {
            const result = await windowsApi.lockScreen(null);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async showDesktop() {
        try {
            const result = await windowsApi.showDesktop(null);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async minimizeAllWindows() {
        try {
            const result = await windowsApi.minimizeAll(null);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async emptyRecycleBin() {
        try {
            const result = await windowsApi.emptyRecycleBin(null);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async volumeSet(level) {
        try {
            const result = await windowsApi.volumeSet(level);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async closeWindow(processName) {
        try {
            const result = await windowsApi.closeWindow(processName);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async focusWindow(processName) {
        try {
            const result = await windowsApi.focusWindow(processName);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    static async maximizeWindow(processName) {
        try {
            const result = await windowsApi.maximizeWindow(processName);
            return result;
        } catch (error) {
            return { success: false, error: error.message, method: "edge-js" };
        }
    }

    // Тест edge-js доступности
    static async testEdgeJs() {
        try {
            // Используем безопасную команду show_desktop вместо lock_screen
            const result = await this.showDesktop();
            return { 
                available: true, 
                test: result.success,
                method: "edge-js",
                performance: "~50-100ms"
            };
        } catch (error) {
            return { 
                available: false, 
                error: error.message,
                method: "edge-js"
            };
        }
    }
}

module.exports = WindowsCommandsEdge;