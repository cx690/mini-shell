module.exports = {
    //...
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            // config: {
            //   certificateFile: './cert.pfx',
            //   certificatePassword: process.env.CERTIFICATE_PASSWORD,
            // },
        },
    ],
    packagerConfig: {
        ignore: [
            'src',
            '.eslintrc.cjs',
            'postcss.config.cjs',
            'tsconfig.json',
            'tsconfig.node.json',
            'vite.config.ts',
            'yarn.lock',
            'node_modules',
            '.vscode',
            '^/electron',
            'public',
            'README.md',
            '.gitignore',
            'forge.config.js',
            'temp'
        ]
    }
}