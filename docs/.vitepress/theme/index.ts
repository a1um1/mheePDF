import DefaultTheme from 'vitepress/theme'
import './custom.css'
import ExampleViewer from './components/ExampleViewer.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ExampleViewer', ExampleViewer)
  }
}
