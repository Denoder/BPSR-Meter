import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import copy from 'rollup-plugin-copy'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
    return {
        main: {
            plugins: [
                externalizeDepsPlugin(),
                copy({
                    targets: [
                        { src: 'translations/*.json', dest: 'out/main/translations' },
                    ],
                    hook: 'writeBundle'
                })
            ],
            build: {
                outDir: 'out/main',
                minify: 'esbuild',
                sourcemap: false,
                target: 'node22',
                rollupOptions: {
                    input: {
                        index: path.resolve(__dirname, 'src/main/index.ts'),
                        server: path.resolve(__dirname, 'src/main/server.ts'),
                    },
                    external: ['electron', 'child_process', 'fs', 'path', 'net', 'url', 'zlib', 'crypto', 'stream'],
                    output: {
                        manualChunks: undefined
                    }
                }
            },
            resolve: {
                alias: {
                    '@main': path.resolve(__dirname, 'src/main')
                }
            }
        },
        preload: {
            plugins: [
                externalizeDepsPlugin()
            ],
            build: {
                outDir: 'out/preload',
                lib: {
                    entry: path.resolve(__dirname, 'src/preload/index.ts'),
                    formats: ['cjs']
                },
                rollupOptions: {
                    external: ['electron']
                }
            }
        },
        renderer: {
            root: path.resolve(__dirname, 'src'),
            build: {
                outDir: path.resolve(__dirname, 'out/renderer'),
                minify: 'esbuild',
                sourcemap: false,
                rollupOptions: {
                    input: {
                        index: path.resolve(__dirname, 'src/index.html'),
                        group: path.resolve(__dirname, 'src/group.html'),
                        history: path.resolve(__dirname, 'src/history.html'),
                        device: path.resolve(__dirname, 'src/device.html'),
                        settings: path.resolve(__dirname, 'src/settings.html'),
                        monsters: path.resolve(__dirname, 'src/monsters.html'),
                        update: path.resolve(__dirname, 'src/update.html'),
                    },
                    output: {
                        manualChunks(id: string) {
                            if (id.includes('node_modules')) {
                                if (id.includes('react') || id.includes('react-dom')) {
                                    return 'vendor-react';
                                }
                                if (id.includes('socket.io-client')) {
                                    return 'vendor-socket';
                                }
                                return 'vendor';
                            }
                        }
                    }
                }
            },
            plugins: [
                react({
                    babel: {
                        plugins: ['babel-plugin-react-compiler'],
                    },
                }),
                tailwindcss(),
                copy({
                    targets: [
                        { src: 'src/icons/*', dest: 'out/renderer/icons' },
                        { src: 'translations/*.json', dest: 'out/renderer/translations' },
                    ],
                    hook: 'writeBundle'
                }),
            ],
            resolve: {
                alias: {
                    '@': path.resolve(__dirname, 'src/renderer'),
                    '@shared': path.resolve(__dirname, 'src/renderer/src/shared'),
                    '@server': path.resolve(__dirname, 'src/server'),
                    '@utils': path.resolve(__dirname, 'src/utils')
                }
            },
            server: {
                port: 5173,
                proxy: {
                    '^/api': {
                        target: 'http://localhost:8989',
                        changeOrigin: true,
                        secure: false
                    }
                }
            }
        }
    }
});

