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
  },

  mode: 'development',

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