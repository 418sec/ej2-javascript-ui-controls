import { Component, INotifyPropertyChanged, NotifyPropertyChanges, Property, Event, EmitType, select } from '@syncfusion/ej2-base';
import { detach, addClass, removeClass, EventHandler, setStyleAttribute, Complex, ModuleDeclaration } from '@syncfusion/ej2-base';
import { isNullOrUndefined as isNOU, closest, extend, L10n, compile } from '@syncfusion/ej2-base';
import { DataManager, UrlAdaptor, Query, WebApiAdaptor, ODataV4Adaptor } from '@syncfusion/ej2-data';
import { Button, ButtonModel } from '@syncfusion/ej2-buttons';
import { RichTextEditorModel } from '@syncfusion/ej2-richtexteditor';
import { DatePicker, DatePickerModel, DateTimePicker } from '@syncfusion/ej2-calendars';
import { DateTimePickerModel, DateRangePickerModel, TimePickerModel } from '@syncfusion/ej2-calendars';
import { NumericTextBox, NumericTextBoxModel, TextBox, TextBoxModel } from '@syncfusion/ej2-inputs';
import { createSpinner, hideSpinner, SpinnerArgs, showSpinner } from '@syncfusion/ej2-popups';
import { Tooltip, TooltipEventArgs, TipPointerPosition } from '@syncfusion/ej2-popups';
import { ColorPickerModel, FormValidator, MaskedTextBox, MaskedTextBoxModel, SliderModel } from '@syncfusion/ej2-inputs';
import { AutoCompleteModel, ComboBoxModel, DropDownList, DropDownListModel, MultiSelectModel } from '@syncfusion/ej2-dropdowns';
/* Inject modules */
import { Rte } from '../modules/rte';
import { Slider } from '../modules/slider';
import { ComboBox } from '../modules/combo-box';
import { TimePicker } from '../modules/time-picker';
import { MultiSelect } from '../modules/multi-select';
import { ColorPicker } from '../modules/color-picker';
import { AutoComplete } from '../modules/auto-complete';
import { DateRangePicker } from '../modules/date-range-picker';
/* Helper modules */
import * as events from './events';
import * as classes from './classes';
/* Models */
import { PopupSettings, modulesList, localeConstant } from './models';
import { InPlaceEditorModel } from './inplace-editor-model';
import { PopupSettingsModel } from './models-model';
/* Interface */
import { ActionBeginEventArgs, ActionEventArgs, FormEventArgs, ValidateEventArgs, IButton } from './interface';
/* Interface */
import { parseValue } from './util';

/**
 * Specifies the mode to be render while editing.
 */
export type RenderMode = 'Inline' | 'Popup';
/**
 * Specifies the action to be perform when user clicks outside the container, that is focus out of editable content.
 */
export type ActionBlur = 'Cancel' | 'Submit' | 'Ignore';
/**
 * Specifies the event action of input to enter edit mode instead of using edit icon.
 */
export type EditableType = 'Click' | 'DblClick' | 'EditIconClick';
/**
 * Specifies the adaptor type that are used DataManager to communicate with DataSource.
 */
export type AdaptorType = 'UrlAdaptor' | 'ODataV4Adaptor' | 'WebApiAdaptor';
/**
 * Specifies the type of components that integrated with In-place editor to make it as editable.
 */
export type InputType = 'AutoComplete' | 'Color' | 'ComboBox' | 'Date' | 'DateRange' | 'DateTime' | 'DropDownList' |
    'Mask' | 'MultiSelect' | 'Numeric' | 'RTE' | 'Slider' | 'Text' | 'Time';
type ComponentTypes = DatePicker | DateTimePicker | DropDownList | MaskedTextBox | NumericTextBox | TextBox;

/**
 * ```html
 * * The In-place editor control is used to edit an element in a place and to update the value in server.
 * <div id='element' />
 * <script>
 *   var editorObj = new InPlaceEditor();
 *   editorObj.appendTo('#element');
 * </script>
 * ```
 */
@NotifyPropertyChanges
export class InPlaceEditor extends Component<HTMLElement> implements INotifyPropertyChanged {
    private tipObj: Tooltip;
    private loaderWidth: number;
    private loader: HTMLElement;
    private spinObj: SpinnerArgs;
    private formEle: HTMLElement;
    private valueEle: HTMLElement;
    private titleEle: HTMLElement;
    private editIcon: HTMLElement;
    private valueWrap: HTMLElement;
    private templateEle: HTMLElement;
    private containerEle: HTMLElement;
    private initRender: boolean = true;
    private inlineWrapper: HTMLElement;
    private isTemplate: boolean = false;
    private formValidate: FormValidator;
    private componentObj: ComponentTypes;
    private isExtModule: boolean = false;
    private submitBtn: Button = undefined;
    private cancelBtn: Button = undefined;
    private isClearTarget: boolean = false;
    private btnElements: HTMLElement = undefined;
    private dataManager: DataManager = undefined;
    private componentRoot: HTMLElement | HTMLInputElement;
    private dataAdaptor: UrlAdaptor | ODataV4Adaptor | WebApiAdaptor;
    private divComponents: string[] = ['RTE', 'Slider'];
    private clearComponents: string[] = ['AutoComplete', 'Mask', 'Text'];
    private moduleList: string[] = ['AutoComplete', 'Color', 'ComboBox', 'DateRange', 'MultiSelect', 'RTE', 'Slider', 'Time'];
    private editEle: HTMLElement;
    /**
     * @hidden
     */
    public needsID: boolean = true;
    /**
     * @hidden
     */
    public atcModule: AutoComplete;
    /**
     * @hidden
     */
    public colorModule: ColorPicker;
    /**
     * @hidden
     */
    public comboBoxModule: ComboBox;
    /**
     * @hidden
     */
    public dateRangeModule: DateRangePicker;
    /**
     * @hidden
     */
    public multiSelectModule: MultiSelect;
    /**
     * @hidden
     */
    public rteModule: Rte;
    /**
     * @hidden
     */
    public sliderModule: Slider;
    /**
     * @hidden
     */
    public timeModule: TimePicker;

    /**
     * * Specifies the name of the field which is used to map data to the server. 
     * If name is not given, then component ID is taken as mapping field name.
     * @default ''
     */
    @Property('')
    public name: string;
    /**
     * Specifies the display value for input when original input value is empty.
     * @default null
     */
    @Property(null)
    public value: string | number | Date | string[] | Date[];
    /**
     * Specifies the HTML element ID as a string that can be added as a editable field.
     * @default ''
     */
    @Property('')
    public template: string | HTMLElement;
    /**
     * Defines single/multiple classes (separated by space) to be used for customization of In-place editor.
     * @default ''
     */
    @Property('')
    public cssClass: string;
    /**
     * Defines the unique primary key of editable field which can be used for saving data in data-base.
     * @default ''
     */
    @Property('')
    public primaryKey: string;
    /**
     * Sets the text to be shown when an element has 'Empty' value.
     * @default 'Empty'
     */
    @Property('Empty')
    public emptyText: string;
    /**
     * Gets the url for server submit action.
     * @default ''
     */
    @Property('')
    public url: string;
    /**
     * Specifies the mode to be render while editing. The possible modes are :
     * Inline: Editable content is displayed as inline text and ok/cancel buttons are displayed at right bottom corner of input.
     * Popup: Editable content and ok/cancel buttons are displayed inside popup while editing.
     * @default 'Popup'
     */
    @Property('Popup')
    public mode: RenderMode;
    /**
     * Specifies the adaptor type that are used DataManager to communicate with DataSource. The possible values are,
     * UrlAdaptor: Base adaptor for interacting with remote data services.
     * ODataV4Adaptor: Used to interact with ODataV4 service.
     * WebApiAdaptor: Used to interact with Web api created with OData endpoint.
     * @default 'UrlAdaptor'
     */
    @Property('UrlAdaptor')
    public adaptor: AdaptorType;
    /**
     * Specifies the type of components that integrated with In-place editor to make it as editable.
     * @default 'Text'
     */
    @Property('Text')
    public type: InputType;
    /**
     * Specifies the event action of input to enter edit mode instead of using edit icon. The possible values are:
     * Click: Do the single click action on input to enter into the edit mode.
     * DblClick: Do the single double click action on input to enter into the edit mode.
     * EditIconClick: Disables the editing of event action of input and allows user to edit only through edit icon.
     * @default 'Click'
     */
    @Property('Click')
    public editableOn: EditableType;
    /**
     * Specifies the action to be perform when user clicks outside the container, that is focus out of editable content.
     * The possible options are,
     * Cancel: Cancel's the editing and resets the old content.
     * Submit: Submit the edited content to the server.
     * Ignore: No action is perform with this type and allows to have many containers open.
     * @default 'Submit'
     */
    @Property('Submit')
    public actionOnBlur: ActionBlur;
    /**
     * Specifies the direction of In-place editor. For cultures like Arabic, Hebrew, etc. direction can be switched to right to left.
     * @default false
     */
    @Property(false)
    public enableRtl: boolean;
    /**
     * Enable or disable persisting component's state between page reloads. If enabled, following list of states will be persisted.
     * 1. value
     * @default false.
     */
    @Property(false)
    public enablePersistence: boolean;
    /**
     * Specifies whether to enable editing mode or not.
     * @default false
     */
    @Property(false)
    public disabled: boolean;
    /**
     * Used to show/hide the ok/cancel buttons of In-place editor.
     * @default true
     */
    @Property(true)
    public showButtons: boolean;
    /**
     * Specifies to show/hide the editing mode.
     * @default false
     */
    @Property(false)
    public enableEditMode: boolean;
    /**
     * Sets to trigger the submit action with enter key pressing of input.
     * @default true
     */
    @Property(true)
    public submitOnEnter: boolean;
    /**
     * Specifies the object to customize popup display settings like positions, animation etc.
     * @default {}
     */
    @Complex<PopupSettingsModel>({}, PopupSettings)
    public popupSettings: PopupSettingsModel;
    // tslint:disable
    /**
     * Specifies the model object configuration for the integrated components like AutoComplete, DatePicker,NumericTextBox, etc.
     * @default null
     */
    @Property(null)
    public model: AutoCompleteModel | ColorPickerModel | ComboBoxModel | DatePickerModel | DateRangePickerModel | DateTimePickerModel | DropDownListModel | MaskedTextBoxModel | MultiSelectModel | NumericTextBoxModel | RichTextEditorModel | SliderModel | TextBoxModel | TimePickerModel;
    // tslint:enable
    /**
     * Used to customize the "Save" button UI appearance by defining Button model configuration.
     * @default { iconCss: 'e-icons e-save-icon' }
     */
    @Property({ iconCss: 'e-icons e-save-icon' })
    public saveButton: ButtonModel;
    /**
     * Used to customize the "Cancel" button UI appearance by defining Button model configuration.
     * @default { iconCss: 'e-icons e-cancel-icon' }
     */
    @Property({ iconCss: 'e-icons e-cancel-icon' })
    public cancelButton: ButtonModel;
    /**
     * Maps the validation rules for the input.
     * @default null
     */
    @Property(null)
    public validationRules: { [name: string]: { [rule: string]: Object } };
    /**
     * The event will be fired once the component rendering is completed.
     * @event
     */
    @Event()
    public created: EmitType<Event>;
    /**
     * The event will be fired before the data submitted to the server.
     * @event
     */
    @Event()
    public actionBegin: EmitType<ActionBeginEventArgs>;
    /**
     * The event will be fired when data submitted successfully to the server.
     * @event
     */
    @Event()
    public actionSuccess: EmitType<ActionEventArgs>;
    /**
     * The event will be fired when data submission failed.
     * @event
     */
    @Event()
    public actionFailure: EmitType<ActionEventArgs>;
    /**
     * The event will be fired while validating current value.
     * @event
     */
    @Event()
    public validating: EmitType<ValidateEventArgs>;
    /**
     * The event will be fired when the component gets destroyed.
     * @event
     */
    @Event()
    public destroyed: EmitType<Event>;
    /**
     * Initialize the event handler
     * @private
     */
    protected preRender(): void {
        if (isNOU(this.model)) {
            this.setProperties({ model: {} }, true);
        }
        this.titleEle = this.createElement('div', { className: classes.TITLE });
    }
    /**
     * To Initialize the In-place editor rendering
     * @private
     */
    protected render(): void {
        this.element.setAttribute('tabindex', '0');
        this.checkIsTemplate();
        this.disable(this.disabled);
        this.updateAdaptor();
        this.appendValueElement();
        this.renderValue(this.checkValue(parseValue(this.type, this.value)));
        this.wireEvents();
        this.setRtl(this.enableRtl);
        this.enableEditor(this.enableEditMode);
        this.setClass('add', this.cssClass);
    }
    /**
     * Initializes a new instance of the In-place editor class.
     * @param options  - Specifies In-place editor model properties as options.
     * @param element  - Specifies the element for which In-place editor applies.
     */
    constructor(options?: InPlaceEditorModel, element?: string | HTMLElement) {
        super(options, <HTMLElement | string>element);
    }
    private setClass(action: string, val: string): void {
        if (!this.isEmpty(val)) {
            action === 'add' ? addClass([this.element], [val]) : removeClass([this.element], [val]);
        }
    }
    private appendValueElement(): void {
        this.valueWrap = this.createElement('div', { id: this.element.id + '_wrap', className: classes.VALUE_WRAPPER });
        this.element.innerHTML = '';
        this.valueEle = this.createElement('span', { className: classes.VALUE });
        this.editIcon = this.createElement('span', {
            className: classes.OVERLAY_ICON + ' ' + classes.ICONS,
            attrs: { 'title': this.getLocale({ editIcon: 'Click to edit' }, 'editIcon') }
        });
        this.valueWrap.appendChild(this.valueEle);
        this.valueWrap.appendChild(this.editIcon);
        this.element.appendChild(this.valueWrap);
    }
    private renderValue(val: string): void {
        this.valueEle.innerHTML = val;
        if (this.type === 'Color') { setStyleAttribute(this.valueEle, { 'color': val }); }
        if (this.mode === 'Inline') {
            removeClass([this.valueWrap], [classes.HIDE]);
        }
    }
    private renderEditor(): void {
        let tipOptions: Object = undefined;
        let target: HTMLElement = <HTMLElement>select('.' + classes.VALUE_WRAPPER, this.element);
        if (this.valueWrap.classList.contains(classes.OPEN)) { return; }
        if (this.mode === 'Inline') {
            this.loaderWidth = this.valueWrap.offsetWidth;
            addClass([this.valueWrap], [classes.HIDE]);
            this.inlineWrapper = this.createElement('div', { className: classes.INLINE });
            this.element.appendChild(this.inlineWrapper);
            this.renderControl(this.inlineWrapper);
            this.afterOpenHandler(null);
        } else {
            let content: HTMLElement = this.createElement('div', { className: classes.POPUP });
            if (!this.isEmpty(this.popupSettings.title)) {
                this.titleEle.innerHTML = this.popupSettings.title;
                content.appendChild(this.titleEle);
            }
            tipOptions = {
                content: content, opensOn: 'Custom',
                enableRtl: this.enableRtl, cssClass: classes.ROOT_TIP,
                afterOpen: this.afterOpenHandler.bind(this)
            };
            content.appendChild(this.renderControl(document.body));
            extend(tipOptions, this.popupSettings.model, tipOptions, true);
            this.tipObj = new Tooltip(tipOptions);
            this.tipObj.appendTo(target);
            this.tipObj.open(target);
        }
        if (this.actionOnBlur !== 'Ignore') {
            this.wireDocEvent();
        }
        this.initRender = false;
        addClass([this.valueWrap], [classes.OPEN]);
        this.setProperties({ enableEditMode: true }, true);
    }
    private setAttribute(ele: HTMLElement, attr: string[]): void {
        let value: string = this.name && this.name.length !== 0 ? this.name : this.element.id;
        attr.forEach((val: string) => {
            ele.setAttribute(val, value);
        });
    }
    private renderControl(target: HTMLElement): HTMLElement {
        let ele: HTMLElement | HTMLInputElement;
        this.containerEle = this.createElement('div', { className: classes.WRAPPER });
        this.loader = this.createElement('div', { className: classes.LOADING });
        this.formEle = this.createElement('form', { className: classes.FORM }) as HTMLFormElement;
        let ctrlGroupEle: HTMLElement = this.createElement('div', { className: classes.CTRL_GROUP });
        let inputWrap: HTMLElement = this.createElement('div', { className: classes.INPUT });
        target.appendChild(this.containerEle);
        this.containerEle.appendChild(this.loader);
        this.loadSpinner();
        this.containerEle.appendChild(this.formEle);
        this.formEle.appendChild(ctrlGroupEle);
        if (this.isTemplate) {
            this.appendTemplate(inputWrap, this.template);
        } else {
            if (Array.prototype.indexOf.call(this.divComponents, this.type) > -1) {
                ele = this.createElement('div') as HTMLElement;
                this.setAttribute(ele, ['id']);
            } else {
                ele = this.createElement('input') as HTMLInputElement;
                this.setAttribute(ele, ['id', 'name']);
            }
            this.componentRoot = ele;
            inputWrap.appendChild(ele);
        }
        ctrlGroupEle.appendChild(inputWrap);
        ctrlGroupEle.appendChild(this.createElement('div', { className: classes.EDITABLE_ERROR }));
        this.appendButtons(this.formEle);
        if (!this.isTemplate) {
            this.renderComponent(ele);
        }
        this.removeSpinner();
        if (this.submitOnEnter) {
            this.wireEditorKeyDownEvent(this.containerEle);
        }
        return this.containerEle;
    }
    private appendButtons(trg: HTMLElement): void {
        if (this.showButtons && trg) {
            this.btnElements = this.renderButtons();
            trg.appendChild(this.btnElements);
            this.wireBtnEvents();
        }
    }
    private renderButtons(): HTMLElement {
        let btnWrap: HTMLElement = this.createElement('div', { className: classes.BUTTONS });
        let primary: string = (!isNOU(this.saveButton.content) && this.saveButton.content.length !== 0) ? (' ' + classes.PRIMARY) : '';
        this.submitBtn = this.createButtons({
            constant: 'save', type: 'submit', container: btnWrap,
            title: { save: 'Save' }, model: this.saveButton,
            className: classes.BTN_SAVE + primary
        });
        this.cancelBtn = this.createButtons({
            type: 'button', constant: 'cancel', title: { cancel: 'Cancel' },
            container: btnWrap, model: this.cancelButton,
            className: classes.BTN_CANCEL
        });
        return btnWrap;
    }
    private createButtons(args: IButton): Button {
        let btnObj: Button = undefined;
        if (Object.keys(args.model).length > 0) {
            let btnEle: HTMLButtonElement = <HTMLButtonElement>this.createElement('button', {
                className: args.className,
                attrs: { 'type': args.type, 'title': this.getLocale(args.title, args.constant) }
            });
            args.container.appendChild(btnEle);
            btnObj = new Button(args.model, btnEle);
        }
        return btnObj;
    }
    private renderComponent(ele: HTMLElement | HTMLInputElement): void {
        this.isExtModule = (Array.prototype.indexOf.call(this.moduleList, this.type) > -1) ? true : false;
        extend(this.model, this.model, { cssClass: classes.ELEMENTS });
        this.model.value = this.value;
        if (this.isExtModule) {
            this.notify(events.render, { module: modulesList[this.type], target: ele, type: this.type });
        } else {
            (this.model as DatePickerModel).showClearButton = true;
            switch (this.type) {
                case 'Date':
                    this.componentObj = new DatePicker(this.model as DatePickerModel, ele as HTMLInputElement);
                    break;
                case 'DateTime':
                    this.componentObj = new DateTimePicker(this.model as DateTimePickerModel, ele as HTMLInputElement);
                    break;
                case 'DropDownList':
                    this.componentObj = new DropDownList(this.model as DropDownListModel, ele as HTMLInputElement);
                    break;
                case 'Mask':
                    this.componentObj = new MaskedTextBox(this.model as MaskedTextBoxModel, ele as HTMLInputElement);
                    break;
                case 'Numeric':
                    if (this.model.value) {
                        this.model.value = (this.model.value as string).toString().replace(/[`~!@#$%^&*()_|\=?;:'",<>\{\}\[\]\\\/]/gi, '');
                    }
                    this.componentObj = new NumericTextBox(this.model as NumericTextBoxModel, ele as HTMLInputElement);
                    break;
                case 'Text':
                    this.componentObj = new TextBox(this.model as TextBoxModel, ele as HTMLInputElement);
                    break;
            }
        }
    }
    private updateAdaptor(): void {
        switch (this.adaptor) {
            case 'UrlAdaptor':
                this.dataAdaptor = new UrlAdaptor;
                break;
            case 'ODataV4Adaptor':
                this.dataAdaptor = new ODataV4Adaptor;
                break;
        }
    }
    private loadSpinner(): void {
        addClass([this.loader], [classes.SHOW]);
        setStyleAttribute(this.loader, { 'width': (this.loaderWidth) + 'px' });
        this.spinObj = { target: this.loader };
        createSpinner(this.spinObj);
        showSpinner(this.spinObj.target);
        if (this.formEle) { addClass([this.formEle], [classes.HIDE]); }
    }
    private removeSpinner(): void {
        this.loader.removeAttribute('style');
        hideSpinner(this.spinObj.target);
        detach(this.spinObj.target.firstChild);
        if (this.formEle) { removeClass([this.formEle], [classes.HIDE]); }
        removeClass([this.loader], [classes.SHOW]);
    }
    private getLocale(prop: Object, val: string): string {
        return new L10n('inplace-editor', prop, this.locale).getConstant(val);
    }
    private checkValue(val: string): string {
        return (!this.isEmpty(val)) ? val : this.emptyText;
    }
    public setValue(): void {
        if (this.isExtModule) {
            this.notify(events.update, { type: this.type });
        } else if (this.componentObj) {
            this.setProperties({ value: this.componentObj.value }, true);
        }
    }
    private getSendValue(): string {
        return (this.type === 'Mask' || this.type === 'Numeric') ? <string>this.value : this.checkValue(parseValue(this.type, this.value));
    }
    private getRenderValue(): string {
        if (this.type === 'Mask' && (<string>this.componentObj.value).length !== 0) {
            return (this.componentObj as MaskedTextBox).getMaskedValue();
        } else if (this.type === 'Numeric') {
            return (this.componentRoot as HTMLInputElement).value;
        } else {
            return parseValue(this.type, this.value);
        }
    }
    private setRtl(value: boolean): void {
        value ? addClass([this.element], [classes.RTL]) : removeClass([this.element], [classes.RTL]);
    }
    private setFocus(): void {
        if (this.isTemplate) { return; }
        this.isExtModule ? this.notify(events.setFocus, {}) : this.componentObj.element.focus();
    }
    private removeEditor(): void {
        let tipEle: HTMLElement;
        if (this.tipObj && this.formEle) {
            tipEle = <HTMLElement>closest(this.formEle, '.' + classes.ROOT_TIP);
            tipEle.classList.add(classes.HIDE);
        }
        this.unWireDocEvent();
        this.destroyComponents();
        this.formEle = undefined;
        if (!isNOU(select('.' + classes.INLINE, this.element))) {
            detach(this.inlineWrapper);
            this.inlineWrapper = undefined;
        } else if (this.tipObj) {
            if (this.type === 'MultiSelect') {
                EventHandler.remove(this.containerEle, 'mousedown', this.popMouseDown);
                EventHandler.remove(this.containerEle, 'click', this.popClickHandler);
            }
            this.tipObj.close();
            this.tipObj.destroy();
            this.tipObj = undefined;
        }
        this.containerEle = undefined;
        removeClass([this.valueWrap], [classes.OPEN, classes.HIDE]);
        this.setProperties({ enableEditMode: false }, true);
    }
    private destroyComponents(): void {
        if (this.showButtons) {
            this.destroyButtons();
        }
        if (this.isExtModule) {
            this.notify(events.destroyModules, {});
        } else {
            if (this.templateEle) {
                document.body.appendChild(this.templateEle);
                this.templateEle.style.display = 'none';
                this.templateEle = undefined;
            }
            if (!isNOU(this.componentObj)) {
                this.componentObj.destroy();
                this.componentObj = undefined;
            }
        }
        if (this.formValidate) {
            this.formValidate = undefined;
        }
        if (this.submitOnEnter && this.containerEle) {
            this.unWireEditorKeyDownEvent(this.containerEle);
        }
    }
    private destroyButtons(): void {
        if (!isNOU(this.submitBtn)) {
            EventHandler.remove(this.submitBtn.element, 'mousedown', this.submitHandler);
            EventHandler.remove(this.submitBtn.element, 'click', this.submitPrevent);
            this.submitBtn.destroy();
            this.submitBtn = undefined;
        }
        if (!isNOU(this.cancelBtn)) {
            EventHandler.remove(this.cancelBtn.element, 'mousedown', this.cancelHandler);
            this.cancelBtn.destroy();
            this.cancelBtn = undefined;
        }
        this.btnElements = undefined;
    }
    private getQuery(params: { [key: string]: string }): Query {
        let query: Query = new Query();
        Object.keys(params).forEach((key: string) => {
            query.addParams(key, params[key]);
        });
        return query;
    }
    private sendValue(): void {
        let eventArgs: ActionBeginEventArgs = { data: { name: this.name, primaryKey: this.primaryKey, value: this.getSendValue() } };
        this.trigger('actionBegin', eventArgs);
        if (!this.isEmpty(this.url) && !this.isEmpty(this.primaryKey)) {
            this.dataManager = new DataManager({ url: this.url, adaptor: this.dataAdaptor });
            this.dataManager.executeQuery(this.getQuery(eventArgs.data), this.successHandler.bind(this), this.failureHandler.bind(this));
        } else {
            let eventArg: ActionEventArgs = { data: {}, value: this.getSendValue() };
            this.triggerSuccess(eventArg);
        }
        this.dataManager = undefined;
    }
    private isEmpty(value: string): boolean {
        return (!isNOU(value) && value.length !== 0) ? false : true;
    }
    private checkIsTemplate(): void {
        this.isTemplate = (!isNOU(this.template) && this.template !== '') ? true : false;
    }
    private templateCompile(trgEle: HTMLElement, tempStr: string): void {
        let tempEle: HTMLElement[];
        if (typeof tempStr === 'string') {
            tempStr = tempStr.trim();
        }
        let compiler: Function = compile(tempStr);
        if (!isNOU(compiler)) {
            tempEle = compiler({}, this, 'template');
        }
        if (!isNOU(compiler) && tempEle.length > 0) {
            [].slice.call(tempEle).forEach((el: HTMLElement): void => {
                trgEle.appendChild(el);
            });
        }
    }
    private appendTemplate(trgEle: HTMLElement, tempStr: string | HTMLElement): void {
        if (typeof tempStr === 'string' || isNOU((<HTMLElement>tempStr).innerHTML)) {
            if ((<string>tempStr)[0] === '.' || (<string>tempStr)[0] === '#') {
                if (document.querySelectorAll(<string>tempStr).length) {
                    this.templateEle = document.querySelector(<string>tempStr);
                    trgEle.appendChild(this.templateEle);
                    this.templateEle.style.display = '';
                } else {
                    this.templateCompile(trgEle, <string>tempStr);
                }
            } else {
                this.templateCompile(trgEle, <string>tempStr);
            }
        } else {
            this.templateEle = tempStr;
            trgEle.appendChild(this.templateEle);
        }
    }

    private disable(value: boolean): void {
        value ? addClass([this.element], [classes.DISABLE]) : removeClass([this.element], [classes.DISABLE]);
    }
    private enableEditor(val: boolean): void {
        (val) ? this.renderEditor() : this.cancelHandler();
    }
    private checkValidation(): void {
        let args: ValidateEventArgs;
        if (this.validationRules) {
            this.formValidate = new FormValidator(this.formEle as HTMLFormElement, {
                rules: this.validationRules,
                validationComplete: (e: FormEventArgs) => {
                    args = {
                        errorMessage: e.message,
                        data: { name: this.name, primaryKey: this.primaryKey, value: this.checkValue(this.getSendValue()) }
                    };
                    this.trigger('validating', args);
                    if (e.status === 'failure') {
                        e.errorElement.innerText = args.errorMessage;
                        this.toggleErrorClass(true);
                    } else {
                        this.toggleErrorClass(false);
                    }
                },
                customPlacement: (inputElement: HTMLElement, errorElement: HTMLElement) => {
                    select('.' + classes.EDITABLE_ERROR, this.formEle).appendChild(errorElement);
                }
            });
            this.formValidate.validate();
        } else {
            args = {
                errorMessage: '',
                data: { name: this.name, primaryKey: this.primaryKey, value: this.checkValue(this.getSendValue()) }
            };
            this.trigger('validating', args);
            if ((args.errorMessage) && (args.data.value === 'Empty')) {
                select('.' + classes.EDITABLE_ERROR, this.formEle).innerHTML = args.errorMessage;
                this.toggleErrorClass(true);
            } else {
                this.toggleErrorClass(false);
            }
        }
    }
    private toggleErrorClass(value: boolean): void {
        if (isNOU(this.formEle)) { return; }
        let inputEle: HTMLElement = <HTMLElement>select('.e-input-group', this.formEle);
        let errorClass: Function = (element: HTMLElement[], val: string, action: string) => {
            [].slice.call(element).forEach((ele: HTMLElement) => {
                if (ele) {
                    action === 'add' ? addClass([ele], [val]) : removeClass([ele], [val]);
                }
            });
        };
        errorClass([this.formEle, inputEle], classes.ERROR, value ? 'add' : 'remove');
    }
    private hideForm(value: boolean): void {
        if (isNOU(this.formEle)) { return; }
        value ? addClass([this.formEle], [classes.HIDE]) : removeClass([this.formEle], [classes.HIDE]);
    }
    private updateArrow(): void {
        let pos: TipPointerPosition = this.tipObj.tipPointerPosition;
        this.tipObj.tipPointerPosition = (pos === 'Middle') ? 'Auto' : 'Middle';
        this.tipObj.tipPointerPosition = pos;
        this.tipObj.dataBind();
    }
    private triggerSuccess(args: ActionEventArgs): void {
        let val: string = args.value;
        this.trigger('actionSuccess', args);
        this.removeSpinner();
        this.hideForm(false);
        this.renderValue(this.checkValue((args.value !== val) ? args.value : this.getRenderValue()));
        this.removeEditor();
    }
    private wireEvents(): void {
        this.wireEditEvent(this.editableOn);
        EventHandler.add(this.editIcon, 'click', this.clickHandler, this);
        EventHandler.add(this.element, 'keydown', this.valueKeyDownHandler, this);
        EventHandler.add(document, 'scroll', this.scrollResizeHandler, this);
        window.addEventListener('resize', this.scrollResizeHandler.bind(this));
        if (Array.prototype.indexOf.call(this.clearComponents, this.type) > -1) {
            EventHandler.add(this.element, 'mousedown', this.mouseDownHandler, this);
        }
    }
    private wireDocEvent(): void {
        EventHandler.add(document, 'mousedown', this.docClickHandler, this);
    }
    private wireEditEvent(event: string): void {
        if (event === 'EditIconClick') { return; }
        let titleConstant: string = (event === 'Click') ? 'editAreaClick' : 'editAreaDoubleClick';
        this.element.setAttribute('title', this.getLocale(localeConstant[event], titleConstant));
        EventHandler.add(this.valueWrap, event.toLowerCase(), this.clickHandler, this);
    }
    private wireEditorKeyDownEvent(ele: HTMLElement): void {
        EventHandler.add(ele, 'keydown', this.enterKeyDownHandler, this);
    }
    private wireBtnEvents(): void {
        if (!isNOU(this.submitBtn)) {
            EventHandler.add(this.submitBtn.element, 'mousedown', this.submitHandler, this);
            EventHandler.add(this.submitBtn.element, 'click', this.submitPrevent, this);
        }
        if (!isNOU(this.cancelBtn)) {
            EventHandler.add(this.cancelBtn.element, 'mousedown', this.cancelHandler, this);
        }
    }
    private submitPrevent(e: Event): void {
     e.preventDefault();
    }
    private unWireEvents(): void {
        this.unWireEditEvent(this.editableOn);
        EventHandler.remove(this.editIcon, 'click', this.clickHandler);
        EventHandler.remove(document, 'scroll', this.scrollResizeHandler);
        window.removeEventListener('resize', this.scrollResizeHandler.bind(this));
        EventHandler.remove(this.element, 'keydown', this.valueKeyDownHandler);
        if (Array.prototype.indexOf.call(this.clearComponents, this.type) > -1) {
            EventHandler.remove(this.element, 'mousedown', this.mouseDownHandler);
        }
    }
    private unWireDocEvent(): void {
        EventHandler.remove(document, 'mousedown', this.docClickHandler);
    }
    private unWireEditEvent(event: string): void {
        if (event === 'EditIconClick') { return; }
        this.element.removeAttribute('title');
        EventHandler.remove(this.valueWrap, event.toLowerCase(), this.clickHandler);
    }
    private unWireEditorKeyDownEvent(ele: HTMLElement): void {
        EventHandler.remove(ele, 'keydown', this.enterKeyDownHandler);
    }
    private afterOpenHandler(e: TooltipEventArgs): void {
        if (this.mode === 'Popup' && this.type === 'MultiSelect') {
            EventHandler.add(this.containerEle, 'mousedown', this.popMouseDown, this);
            EventHandler.add(this.containerEle, 'click', this.popClickHandler, this);
        }
        if (this.mode === 'Popup' && !this.isEmpty(this.titleEle.innerHTML)) {
            e.element.classList.add(classes.TIP_TITLE);
        }
        if (this.type === 'RTE') {
            this.rteModule.refresh();
        } else if (this.type === 'Slider') {
            this.sliderModule.refresh();
        }
        this.setFocus();
    }
    private popMouseDown(e: MouseEvent): void {
        let trgClass: DOMTokenList = (<Element>e.target).classList;
        if (trgClass.contains('e-chips-close') && !trgClass.contains('e-close-hooker') ) {
            this.updateArrow();
        }
    }
    private clickHandler(e: MouseEvent): void {
        if (this.editableOn !== 'EditIconClick') {
            e.stopPropagation();
        }
        this.renderEditor();
    }
    private submitHandler(e: MouseEvent): void {
        e.preventDefault();
        this.save();
    }
    private cancelHandler(): void {
        this.removeEditor();
    }
    private popClickHandler(e: MouseEvent): void {
        let tipTarget: HTMLElement = <HTMLElement>select('.' + classes.VALUE_WRAPPER, this.element);
        if ((<Element>e.target).classList.contains('e-chips-close')) {
            this.tipObj.refresh(tipTarget);
        }
    }
    private successHandler(e: Object): void {
        let eventArgs: ActionEventArgs = { data: e, value: this.getSendValue() };
        this.triggerSuccess(eventArgs);
    }
    private failureHandler(e: Object): void {
        let eventArgs: ActionEventArgs = { data: e, value: this.getSendValue() };
        this.trigger('actionFailure', eventArgs);
        this.removeSpinner();
        this.hideForm(false);
        if (this.mode === 'Popup') { this.updateArrow(); }
    }
    private enterKeyDownHandler(e: KeyboardEvent): void {
        if ((e.keyCode === 13 && e.which === 13) || (e.keyCode === 27 && e.which === 27)) {
            this.save();
        }
    }
    private valueKeyDownHandler(e: KeyboardEvent): void {
        if ((e.keyCode === 13 && e.which === 13) && (e.target as Element).classList.contains(classes.ROOT) &&
            !this.valueWrap.classList.contains(classes.OPEN) && !this.element.classList.contains(classes.DISABLE)) {
            e.preventDefault();
            this.renderEditor();
        }
    }
    private mouseDownHandler(e: Event): void {
        if ((<Element>e.target).classList.contains('e-clear-icon')) {
            this.isClearTarget = true;
        }
    }
    private scrollResizeHandler(): void {
        if (this.mode === 'Popup' && this.tipObj) {
            this.removeEditor();
        }
    }
    private docClickHandler(e: Event): void {
        let trg: Element = <Element>e.target;
        if (this.isClearTarget) {
            this.isClearTarget = false;
            return;
        }
        let relateRoot: Element = closest(trg, '.' + classes.ROOT);
        let relateTipRoot: Element = closest(trg, '.' + classes.ROOT_TIP);
        let relateElements: Element = closest(trg, '.' + classes.ELEMENTS);
        let relateRTEElements: Element = closest(trg, '.e-rte-elements');
        if ((!isNOU(relateRoot) && relateRoot.isEqualNode(this.element)) ||
            (!isNOU(relateTipRoot) && this.tipObj && (relateTipRoot.id.indexOf(this.valueWrap.id) > -1)) ||
            !isNOU(relateElements) || !isNOU(relateRTEElements) || trg.classList.contains('e-chips-close')) {
            return;
        } else {
            if (this.actionOnBlur === 'Submit') {
                this.save();
            } else if (this.actionOnBlur === 'Cancel') {
                this.cancelHandler();
            }
        }
    }
    /**
     * Validate current editor value.
     * @returns void
     */
    public validate(): void {
        this.checkValidation();
    }
    /**
     * Submit the edited input value to the server.
     * @returns void
     */
    public save(): void {
        this.element.focus();
        this.editEle = <HTMLElement>select('.' + classes.INPUT, this.formEle);
        if (<HTMLElement>select('.' + classes.ERROR, this.editEle) && isNOU(this.validationRules) ) {
            return;
        }
        if (!this.isTemplate) {
            this.setValue();
        }
        this.checkValidation();
        if (!this.formEle.classList.contains(classes.ERROR)) {
            this.loadSpinner();
            this.hideForm(true);
            if (this.mode === 'Popup') { this.updateArrow(); }
            this.sendValue();
        }
    }
    /**
     * Removes the control from the DOM and also removes all its related events.
     * @returns void
     */
    public destroy(): void {
        this.removeEditor();
        if (this.isExtModule) {
            this.notify(events.destroy, {});
        }
        this.unWireEvents();
        let classList: string[] = [classes.ROOT, classes.DISABLE, classes.RTL];
        classList.forEach((val: string): void => {
            removeClass([this.element], [val]);
        });
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        super.destroy();
    }
    /**
     * Get the properties to be maintained in the persisted state.
     * @returns string
     */

    protected getPersistData(): string {
        return this.addOnPersist(['value']);
    }
    /**
     * To provide the array of modules needed for component rendering
     * @return {ModuleDeclaration[]}
     * @hidden
     */
    public requiredModules(): ModuleDeclaration[] {
        let modules: ModuleDeclaration[] = [];
        modules.push({ member: modulesList[this.type], args: [this] });
        return modules;
    }
    /**
     * Returns the current module name.
     * @returns string
     * @private
     */
    protected getModuleName(): string {
        return 'inplaceeditor';
    }
    /**
     * Gets called when the model property changes.The data that describes the old and new values of property that changed.
     * @param  {InPlaceEditorModel} newProp
     * @param  {InPlaceEditorModel} oldProp
     * @returns void
     * @private
     */
    public onPropertyChanged(newProp: InPlaceEditorModel, oldProp: InPlaceEditorModel): void {
        this.removeEditor();
        for (let prop of Object.keys(newProp)) {
            switch (prop) {
                case 'showButtons':
                    (newProp.showButtons) ? this.appendButtons(this.formEle) : this.destroyButtons();
                    break;
                case 'value':
                case 'emptyText':
                    this.renderValue(this.checkValue(parseValue(this.type, this.value)));
                    break;
                case 'template':
                    this.checkIsTemplate();
                    break;
                case 'disabled':
                    this.disable(newProp.disabled);
                    break;
                case 'enableRtl':
                    this.setRtl(newProp.enableRtl);
                    break;
                case 'cssClass':
                    this.setClass('remove', oldProp.cssClass);
                    this.setClass('add', newProp.cssClass);
                    break;
                case 'mode':
                    this.enableEditor(this.enableEditMode);
                    break;
                case 'enableEditMode':
                    this.enableEditor(newProp.enableEditMode);
                    break;
                case 'editableOn':
                    this.unWireEditEvent(oldProp.editableOn);
                    if (newProp.editableOn !== 'EditIconClick') { this.wireEditEvent(newProp.editableOn); }
                    break;
            }
        }
    }
}