declare namespace NodeJS {
    interface Process {
        env: {
            readonly NODE_ENV: 'development' | 'production';
            readonly buildTime: string;
            readonly version: string;
            ELECTRON_DISABLE_SECURITY_WARNINGS: boolean;
            [key: string]: any;
        }
    }
}
