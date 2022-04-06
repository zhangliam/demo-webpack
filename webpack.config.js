const path = require('path');
// webpack-merge 提取本地、测试、生产环境公用配置
const merge = require('webpack-merge');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// SpeedMeasurePlugin 分析打包过程loader & plugin耗费时间
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = smp.wrap({

  entry: './src/index.js',

  output: {
    filename: 'main@[chunkhash].js',
    // path: path.resolve(__dirname, 'dist'),
		// chunkFilename: '[name].js'
  },

	dev: 'source-map',
  mode: 'development',
	
	// splitchunks(代码分片)默认提取条件
	// 1. 提取后chunk可被共享或者来自node_modules目录, 理解为多次引用或处于node_modules模块更倾向于通用模块适合提取
	// 2. 提取后Js chunk大于30kb, css chunk大于50kb, 如果提取资源太小带来的优化效果也一般
	// 3. 按需加载过程中, 并行的请求资源最大值小于等于5, 按需加载指动态插入js标签加载的脚本, 因不希望加载过多资源, so提取规则在并行请求不多生效
	// 4. 首次加载时, 并行请求资源数最大值小于等于3
	
	optimization: {
		splitchunks: {
			// async: 默认只提取异步chunk, initial: 针对入口chunk生效, all: 皆可
			chunks: 'async',
			minSize: {
				javascript: 30000,
				style: 50000,
			},
			maxSize: 0,
			minChunks: 1,
			maxAsyncRequests: 5,
			minInitialRequests: 3,
			automaticNameDelimiter: '~',
			// 根据cacheGroups和作用范围自动生成chunk命名, 并automaticNameDelimiter分隔
			name: true,
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					priority: -10,
				},
				default: {
					minchunks: 2,
					priority: -20,
					reuseExsitingChunk: true
				},
			},
		},
	},

  plugins: [
		
  	new HtmlWebpackPlugin({
  		template: './template.html'
  	}),

    // 定义webpack环境变量
  	new webpack.DefinePlugin({
  		ENV: JSON.stringify('production'),
  	}), 

  	new BundleAnalyzerPlugin({
  		analyzerMode: 'disabled', // 不启动展示打包报告的http服务器
      generateStatsFile: true, // 是否生成stats.json文件
  	}),

  	// IgnorePlugin - moment.js不加载其他语言包
  	// new webpack.IgnorePlugin({
  	// 	resourceRegExp: /^\.\/locale$/, // 匹配资源文件
  	// 	contexRegExp: /moment$/, // 匹配检索目录
  	// }),

    new webpack.DllReferencePlugin({
      manifest: require(path.join(__dirname, 'dll/manifest.json'))
    }),
    // 解决vendor生成moduleid改变，引用文件并未修改而chunk hash改变则不加载缓存
    // new webpack.HashedModuleIdsPlugin(),

  ],	


  /*
		打包优化(宏观无非两种: 增加资源、 缩小范围):
		1. 多线程打包 - HappyPack(老版本) / thread-load(多进程worker编译)
		2. 缩小打包作用域 (include/exclude, noParse, IgnorePlugin)
		3. 动态链接库思想 & DllPlugin(webpack4后已废弃)
		4. 死代码检测 & tree-shaking
  */
	
	
	
	/*
		资源异步加载: import加载的模块及其依赖会被异步加载并返回Promise对象, 如果js资源体积很大可在初次渲染并不需要使用时可以异步加载
		eg: import('.bar.js').then(({ add }) => { console.log(add(1,2)) })
	*/


  module: {

  	rules: [
  		{
  			test: /\.js$/,
        // include缩小范围
  			include: /src\/scripts/,
        use: [
          // thread-load需要放在heavy-load前面即可(eg: 一般heavy-load为babel-loader&css-loader)
          {
            loader: 'thread-load',
            options: {
              workers: 2,
            },
          },
        
          {
            // 'babel-loader?cacheDirectory=true' 缓存webpack4中需开启cacheDirectory, webpack5则默认开启
            loader: 'babel-loader',
             options: {
                presets: [
                  [ 
                    '@babel/presets-env',
                    // 死代码检测 & tree-shaking: ES6 Module依赖关系构建为编译时非运行阶段, npm包默认commonJS形式需设置false即为ES6 Module导出
                    { modules: false }
                  ],
                ],
             }
          },

        ],
  		},
  	],

  	// 打包但不解析
  	noParse: /lodash/,

  },

});
