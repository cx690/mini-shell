declare namespace NodeJS {
    interface Process {
        env: {
            /** 注意生产模式下node端为undefined，不要使用production作为比较 */
            readonly NODE_ENV?: 'development' | 'production';
            readonly buildTime: number;
            readonly version: string;
            ELECTRON_DISABLE_SECURITY_WARNINGS: boolean;
            [key: string]: any;
        }
    }
}
