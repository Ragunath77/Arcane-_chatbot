function Header() {
    try {
        return (
            <header data-name="header" data-file="components/Header.js" 
                    className="bg-gray-900 professional-border border-b px-6 py-4 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <i data-lucide="cpu" className="w-5 h-5 text-white"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-white tracking-tight">
                                Chitti
                            </h1>
                            <p className="text-xs text-gray-400 font-medium">AI Assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-md professional-border">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-300 font-medium">Active</span>
                        </div>
                    </div>
                </div>
            </header>
        );
    } catch (error) {
        console.error('Header component error:', error);
        reportError(error);
    }
}
