declare namespace NodeJS {
    interface Process {
        env: {
            /** 注意生产模式下node端一般为undefined，想字符串替换的话请使用import.meta.env.DEV */
            readonly NODE_ENV?: 'development' | 'production';
            readonly buildTime: number;
            readonly version: string;
            ELECTRON_DISABLE_SECURITY_WARNINGS: boolean;
            [key: string]: any;
        }
    }
}
