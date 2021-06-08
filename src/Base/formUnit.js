import Vue from 'vue'
import components from './components'
import validate, { extend } from '../validator'
import { debounce, isRegExp } from '../utils'

const formUnitBase = Vue.extend({
  components,

  provide () {
    return {
      VFormRoot: this,
      $validate: validate
    }
  },

  props: {
    // 数据模型
    model: {
      type: Array,
      required: true,
      default: () => []
    },

    value: {
      type: Object,
      default: () => ({})
    },

    // 局部校验规则
    validator: {
      type: Object,
      default: () => ({})
    },

    disabled: {
      type: Boolean,
      default: false
    },

    labelWidth: {
      type: String,
      default: ''
    },

    labelPosition: {
      type: String,
      default: 'left'
    },

    labelColor: {
      type: String,
      default: ''
    },

    showLabel: {
      type: Boolean,
      default: true
    }
  },

  data () {
    return {
      // 内部数据模型
      formModel: [],

      // 处理后的 value
      formValues: {},

      // 所有的错误信息
      formErrors: {},
      showErrorMessage: false,

      crossFields: {},

      debounceChange: null
    }
  },

  computed: {
    formErrorList () {
      return Object.values(this.formErrors).filter(v => Object.values(v).length !== 0).sort((a, b) => a.index - b.index)
    },

    isValid () {
      return this.formErrorList.length === 0
    }
  },

  watch: {
    value: {
      deep: true,
      handler (value) {
        this.formValues = value
        for (let [_key, _value] of Object.entries(value)) {
          this.model.forEach(item => {
            if (item.key === _key) {
              item.value = _value
            }
          })
        }
      }
    }
  },

  created () {
    // 统一传递数据
    this.debounceChange = debounce((value) => {
      this.$emit('input', value)
      this.$emit('change', {
        value,
        errorMsg: this.formErrorList,
        isValid: this.isValid
      })
    }, this.$VForm.debounceTime)

    // 创建数据模型
    this.createModel()

    // 注册局部校验规则
    extend(this.validator)
  },

  methods: {
    validate (callback) {
      this.showErrorMessage = true
      typeof callback === 'function' && callback(this.isValid)
    },

    createModel () {
      const formModel = this.$VForm.primaryData ? this.modelFormatter(this.model) : this.model
      this.formModel = formModel

      const formValues = {}

      formModel.forEach(item => {
        const { key, value, rules } = item

        // 排除展示类组件
        if (!(['VCell', 'VText'].includes(rules.type))) {
          formValues[key] = value
        }

        // 生成跨域校验字段
        if (!isRegExp(rules.vRules)) {
          const crossFields = (rules.vRules || '').match(/\w+:@\w+(,@\w+)*/g) || []
          crossFields.forEach(_ => {
            const [name, cross] = _.split(':')
            this.crossFields[name] = {
              local: key,
              target: cross.split(',').map(_ => _.replace('@', ''))
            }
          })
        }
      })
      this.formValues = formValues
      this.debounceChange(formValues)
    },

    // 处理数据模型
    // 当所有的属性不存在 rules 字段的情况下调用
    modelFormatter (model) {
      const fixedKeys = ['key', 'value']
      const result = []
      model.forEach(item => {
        const resultItem = {
          rules: {}
        }
        for (const [key, value] of Object.entries(item)) {
          if (fixedKeys.includes(key)) {
            resultItem[key] = value
            continue
          }
          resultItem.rules[key] = value
        }
        result.push(resultItem)
      })
      return result
    },

    // 分割组件类型
    splitComponentType (type) {
      let [compType, compParameter = ''] = type.split('|')
      return [compType, compParameter]
    },

    // 数据上报
    updateFormValues (index, value) {
      this.$set(this.formValues, this.formModel[index].key, value)
      this.formModel[index].value = value
      this.debounceChange(this.formValues)
    },

    // 获取子级错误信息
    getChildError (name, err) {
      this.$set(this.formErrors, name, err)
      this.debounceChange(this.value)
    }
  }
})

export default formUnitBase
