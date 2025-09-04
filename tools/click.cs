using System;
using System.Runtime.InteropServices;
using System.Threading;

class ClickProgram
{
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);

    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;

    static void Main(string[] args)
    {
        int x = 960, y = 540; // Default center
        if (args.Length >= 2)
        {
            int.TryParse(args[0], out x);
            int.TryParse(args[1], out y);
        }

        // Find Chrome window and bring to front
        IntPtr chromeWindow = FindWindow("Chrome_WidgetWin_1", null);
        if (chromeWindow != IntPtr.Zero)
        {
            SetForegroundWindow(chromeWindow);
            Thread.Sleep(100);
        }

        // Move cursor and click
        SetCursorPos(x, y);
        Thread.Sleep(50);
        
        // Perform click at cursor position
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        
        Console.WriteLine("Clicked at " + x + ", " + y);
    }
}