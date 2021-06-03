module.exports = {
  packagerConfig: {},

  plugins: [
    ['@electron-forge/plugin-webpack',
      {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [{
            html: './src/renderer/index.html',
            js: './src/renderer/index.jsx',
            name: 'main_window',
            preload: {
              js: './src/preload.js',
            },
          }, {
            html: './src/worker/worker.html',
            js: './src/worker/worker.js',
            name: 'worker_window',
            preload: {
              js: './src/worker_preload.js',
            },
          }]
        }
      }
    ]
  ],

  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "publisher"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    },
    {
      name: "@electron-forge/maker-deb",
      config: {}
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {}
    }
  ]
}