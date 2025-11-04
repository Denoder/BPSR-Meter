import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import copy from 'rollup-plugin-copy'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    main: {
        plugins: [
            externalizeDepsPlugin(),
            copy({
                targets: [
                    { src: 'algo/blueprotobuf.js', dest: 'out/main/algo' },
                    { src: 'translations/*.json', dest: 'out/main/translations' },
                ],
                hook: 'writeBundle'
            })
        ],
        build: {
            outDir: 'out/main',
            rollupOptions: {
                input: {
                    index: path.resolve(__dirname, 'src/main/index.ts'),
                    server: path.resolve(__dirname, 'src/main/server.ts'),
                },
                external: ['electron', 'child_process', 'fs', 'path', 'net', 'url']
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
            rollupOptions: {
                input: {
                    index: path.resolve(__dirname, 'src/index.html'),
                    group: path.resolve(__dirname, 'src/group.html'),
                    history: path.resolve(__dirname, 'src/history.html'),
                    device: path.resolve(__dirname, 'src/device.html'),
                    settings: path.resolve(__dirname, 'src/settings.html'),
                    monsters: path.resolve(__dirname, 'src/monsters.html'),
                }
            }
        },
        plugins: [
            react(),
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
                '@shared': path.resolve(__dirname, 'src/types'),
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
})

