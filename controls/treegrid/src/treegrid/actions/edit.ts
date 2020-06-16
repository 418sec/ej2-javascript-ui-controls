import { Grid, Edit as GridEdit, SaveEventArgs, CellSaveArgs, CellEditArgs, getUid, getObject,
  NotifyArgs, Row, ActionEventArgs} from '@syncfusion/ej2-grids';
import { BatchCancelArgs, Column, RecordDoubleClickEventArgs, RowInfo } from '@syncfusion/ej2-grids';
import { TreeGrid } from '../base/treegrid';
import { ITreeData, CellSaveEventArgs } from '../base/interface';
import * as events from '../base/constant';
import { isNullOrUndefined, extend, setValue, removeClass, KeyboardEventArgs, addClass, getValue, isBlazor } from '@syncfusion/ej2-base';
import { updateBlazorTemplate } from '@syncfusion/ej2-base';
import { DataManager, Deferred, RemoteSaveAdaptor, AdaptorOptions } from '@syncfusion/ej2-data';
import { findChildrenRecords, getParentData, isRemoteData  } from '../utils';
import { editAction, updateParentRow } from './crud-actions';
import { RowPosition } from '../enum';
import { BatchEdit } from './batch-edit';

/**
 * TreeGrid Edit Module
 * The `Edit` module is used to handle editing actions.
 */
export class Edit {
    private parent: TreeGrid;
    private isSelfReference: boolean;
    private addedRecords: string = 'addedRecords';
    private deletedRecords: string = 'deletedRecords';
    private addRowIndex: number;
    private addRowRecord: ITreeData;
    private isOnBatch: boolean;
    private keyPress: string;
    private selectedIndex: number;
    private doubleClickTarget: Element;
    private internalProperties: ITreeData;
    private previousNewRowPosition : RowPosition;
    private batchEditModule: BatchEdit;
    /**
     * Constructor for Edit module
     */
    constructor(parent: TreeGrid) {
        Grid.Inject(GridEdit);

        this.parent = parent;
        this.isSelfReference = !isNullOrUndefined(parent.parentIdMapping);
        this.previousNewRowPosition = null;
        this.internalProperties = {};
        this.batchEditModule = new BatchEdit(this.parent);
        this.addEventListener();
    }
    /**
     * For internal use only - Get the module name.
     * @private
     */
    protected getModuleName(): string {
        return 'edit';
    }

    /**
     * @hidden
     */
    public addEventListener(): void {
        this.parent.on(events.crudAction, this.crudAction, this);
        this.parent.on(events.beginEdit, this.beginEdit, this);
        this.parent.on(events.beginAdd, this.beginAdd, this);
        this.parent.on(events.recordDoubleClick, this.recordDoubleClick, this);
        this.parent.on(events.cellSave, this.cellSave, this);
        this.parent.on(events.batchCancel, this.batchCancel, this);
        this.parent.grid.on(events.keyPressed, this.keyPressed, this);
        this.parent.grid.on('batchedit-form', this.lastCellTab, this);
        this.parent.grid.on('content-ready', this.contentready, this);
        this.parent.on(events.cellEdit, this.cellEdit, this);
        this.parent.on('actionBegin', this.editActionEvents, this);
        this.parent.on('actionComplete', this.editActionEvents, this);
        this.parent.grid.on(events.doubleTap, this.recordDoubleClick, this);
        this.parent.grid.on('dblclick', this.gridDblClick, this);
        this.parent.on('savePreviousRowPosition', this.savePreviousRowPosition, this);
        // this.parent.on(events.beforeDataBound, this.beforeDataBound, this);
        this.parent.grid.on(events.beforeStartEdit, this.beforeStartEdit, this);
        this.parent.grid.on(events.beforeBatchCancel, this.beforeBatchCancel, this);
      }
      private gridDblClick(e: MouseEvent): void {
        this.doubleClickTarget = e.target as HTMLElement;
      }
      private beforeStartEdit(args: Object) : void {
        this.parent.trigger(events.actionBegin, args);
      }
      private beforeBatchCancel(args: Object) : void {
        if (this.parent.editSettings.mode === 'Cell') {
            this.parent.trigger(events.actionComplete, args);
        }
      }
      /**
       * @hidden
       */
    public removeEventListener(): void {
        if (this.parent.isDestroyed) { return; }
        this.parent.off(events.crudAction, this.crudAction);
        this.parent.off(events.beginEdit, this.beginEdit);
        this.parent.off(events.beginAdd, this.beginAdd);
        this.parent.off(events.recordDoubleClick, this.recordDoubleClick);
        this.parent.off(events.batchCancel, this.batchCancel);
        this.parent.grid.off(events.keyPressed, this.keyPressed);
        this.parent.grid.off('batchedit-form', this.lastCellTab);
        this.parent.grid.off('content-ready', this.contentready);
        this.parent.off(events.cellEdit, this.cellEdit);
        this.parent.off('actionBegin', this.editActionEvents);
        this.parent.off('actionComplete', this.editActionEvents);
        this.parent.grid.off(events.doubleTap, this.recordDoubleClick);
        this.parent.off('savePreviousRowPosition', this.savePreviousRowPosition);
        this.parent.grid.off(events.beforeStartEdit, this.beforeStartEdit);
        this.parent.grid.off(events.beforeBatchCancel, this.beforeBatchCancel);
        this.parent.grid.off('dblclick', this.gridDblClick);
        //this.parent.grid.off('click', this.gridSingleClick);
      }
      /**
       * To destroy the editModule 
       * @return {void}
       * @hidden
       */
      public destroy(): void {
        this.removeEventListener();
      }

    /**
     * @hidden
     */
    public applyFormValidation(cols?: Column[]): void {
      this.parent.grid.editModule.applyFormValidation(cols);
    }
    private editActionEvents(args: Object): void {
      let eventArgs: ActionEventArgs | CellSaveEventArgs = getObject('editAction', args);
      let eventName: string = getObject('name', eventArgs);
      let treeObj: TreeGrid = this.parent;
      let adaptor: AdaptorOptions = (treeObj.dataSource as DataManager).adaptor;
      if ((isRemoteData(treeObj) || adaptor instanceof RemoteSaveAdaptor) &&
          (eventArgs.requestType === 'save' && eventArgs.action === 'add') &&
          (treeObj.editSettings.newRowPosition === 'Child' || treeObj.editSettings.newRowPosition === 'Below'
          || treeObj.editSettings.newRowPosition === 'Above')) {
        if (eventName === 'actionBegin') {
          let rowIndex: number = isNullOrUndefined(eventArgs.row) || !Object.keys(eventArgs.row).length ? this.selectedIndex :
                (<HTMLTableRowElement>eventArgs.row).rowIndex - 1;
          let keyData: string = (!isNullOrUndefined(rowIndex) && rowIndex !== -1) ?
                treeObj.getCurrentViewRecords()[rowIndex][treeObj.getPrimaryKeyFieldNames()[0]] : -1;
          treeObj.grid.query.addParams('relationalKey', keyData);
        } else if (eventName === 'actionComplete') {
          let paramsLength: number = treeObj.grid.query.params.length;
          for (let i: number = 0; i < paramsLength; i++) {
            if (treeObj.grid.query.params[i].key === 'relationalKey') {
              treeObj.grid.query.params.splice(i);
            }
          }
        }
      }
      if (this.parent.editSettings.mode === 'Batch' &&  eventArgs.requestType === 'paging') {
          this.parent.notify('batchPageAction', {});
      }
    }
    private recordDoubleClick(args: RecordDoubleClickEventArgs): void {
      let target: HTMLElement = <HTMLElement>args.target;
      if (isNullOrUndefined(target.closest('td.e-rowcell'))) {
        return;
      }
      let column: Column = this.parent.grid.getColumnByIndex(+target.closest('td.e-rowcell').getAttribute('aria-colindex'));
      if (this.parent.editSettings.mode === 'Cell' && !this.isOnBatch && column && !column.isPrimaryKey &&
        column.allowEditing && !(target.classList.contains('e-treegridexpand') ||
          target.classList.contains('e-treegridcollapse')) && this.parent.editSettings.allowEditOnDblClick) {
        this.isOnBatch = true;
        this.parent.grid.setProperties({ selectedRowIndex: args.rowIndex }, true);
        this.updateGridEditMode('Batch');
      }
    }
  private updateGridEditMode(mode: string): void {
    this.parent.grid.setProperties({editSettings: {mode: mode}}, true);
    let updateMethod: Function = getObject('updateEditObj', this.parent.grid.editModule) as Function;
    updateMethod.apply(this.parent.grid.editModule);
    this.parent.grid.isEdit = false;
  }
  private keyPressed(args: KeyboardEventArgs): void {
    if (this.isOnBatch || (this.parent.editSettings.mode === 'Cell' && isBlazor() && this.parent.isServerRendered)) {
      this.keyPress = args.action;
    }
    if (args.action === 'f2') {
      this.recordDoubleClick(args as Object);
    }
  }

  private deleteUniqueID( value: string) : void {
    let idFilter: string = 'uniqueIDFilterCollection';
    delete this.parent[idFilter][value];
    let id: string = 'uniqueIDCollection';
    delete this.parent[id][value];
  }

  private cellEdit(args: CellEditArgs): Deferred | void {
    let promise: string = 'promise';
    let prom: Deferred = args[promise];
    delete args[promise];
    if (this.keyPress !== 'enter') {
      this.parent.trigger(events.cellEdit, args, (celleditArgs: CellEditArgs) => {
        if (!celleditArgs.cancel && this.parent.editSettings.mode === 'Cell') {
          this.enableToolbarItems('edit');
        } else if (celleditArgs.cancel && this.parent.editSettings.mode === 'Cell') {
            this.isOnBatch = false;
            this.updateGridEditMode('Normal');
        }
        if (!isNullOrUndefined(prom)) {
          prom.resolve(celleditArgs);
        }
      });
    }
    if (this.doubleClickTarget && (this.doubleClickTarget.classList.contains('e-treegridexpand') ||
      this.doubleClickTarget.classList.contains('e-treegridcollapse'))) {
      args.cancel = true; this.doubleClickTarget = null;
      return;
    }
    if (this.parent.editSettings.mode === 'Cell') {
      if (this.keyPress === 'tab' || this.keyPress === 'shiftTab') {
        this.keyPress = null;
      } else if (this.keyPress === 'enter') {
        args.cancel = true;
        this.keyPress = null;
      }
  }
    // if (this.isAdd && this.parent.editSettings.mode === 'Batch' && !args.cell.parentElement.classList.contains('e-insertedrow')) {
    //   this.isAdd = false;
    // }
  }

  private enableToolbarItems(request: string): void {
    if (!isNullOrUndefined(this.parent.grid.toolbarModule)) {
      let toolbarID: string = this.parent.element.id  + '_gridcontrol_';
      this.parent.grid.toolbarModule.enableItems([toolbarID + 'add', toolbarID + 'edit', toolbarID + 'delete'], request === 'save');
      this.parent.grid.toolbarModule.enableItems([toolbarID + 'update', toolbarID + 'cancel'], request === 'edit' );
    }
  }

  private batchCancel(e: BatchCancelArgs): void {
    if (this.parent.editSettings.mode === 'Cell') {
      let cellDetails: RowInfo = getValue('editModule.cellDetails', this.parent.grid.editModule);
      let selectRowIndex: number = cellDetails.rowIndex;
      let treeCell : HTMLElement;
      if (this.parent.allowRowDragAndDrop === true && !(this.parent.rowDropSettings.targetID)) {
        treeCell = this.parent.getRows()[selectRowIndex].cells[this.parent.treeColumnIndex + 1];
      } else {
        treeCell = this.parent.getRows()[selectRowIndex].cells[this.parent.treeColumnIndex];
      }
      this.parent.renderModule.cellRender({
        data: cellDetails.rowData,
        cell: treeCell,
        column: this.parent.grid.getColumns()[this.parent.treeColumnIndex]
      });
      this.updateGridEditMode('Normal');
      this.isOnBatch = false;
    }
    if (this.parent.editSettings.mode === 'Batch') {
      this.parent.notify('batchCancelAction', {});
    }
  }
    private cellSave(args: CellSaveArgs): void {
      if (this.parent.editSettings.mode === 'Cell' && this.parent.element.querySelector('form')) {
          args.cancel = true;
          let editModule: string = 'editModule';
          setValue('isEdit', false, this.parent.grid);
          setValue('isEditCollapse', true, this.parent);
          args.rowData[args.columnName] = args.value;
          let row: HTMLTableRowElement;
          let mRow: HTMLTableRowElement;
          if (isNullOrUndefined(args.cell)) {
            row = this.parent.grid.editModule[editModule].form.parentElement.parentNode;
          } else {
            row = <HTMLTableRowElement>args.cell.parentNode;
          }
          let rowIndex: number;
          let primaryKeys: string[] = this.parent.getPrimaryKeyFieldNames();
          if (isNullOrUndefined(row)) {
            this.parent.grid.getCurrentViewRecords().filter((e: ITreeData, i: number) => {
                 if (e[primaryKeys[0]] === args.rowData[primaryKeys[0]]) { rowIndex = i; return; }
                });
          } else {
            rowIndex = (this.parent.getRows().indexOf(row) === -1 && this.parent.frozenColumns > 0) ?
                       this.parent.grid.getMovableRows().indexOf(row) : this.parent.getRows().indexOf(row);
          }
          let arg: CellSaveEventArgs = {};
          extend(arg, args);
          arg.cancel = false;
          arg.type = 'save';
          row = <HTMLTableRowElement>this.parent.grid.getRows()[row.rowIndex];
          this.parent.trigger(events.actionBegin, arg);
          if (!arg.cancel) {
            this.blazorTemplates(args);
            this.updateCell(args, rowIndex);
            if (this.parent.grid.aggregateModule) {
              this.parent.grid.aggregateModule.refresh(args.rowData);
            }
            this.parent.grid.editModule.destroyWidgets([this.parent.grid.getColumnByField(args.columnName)]);
            this.parent.grid.editModule.formObj.destroy();
            if (this.keyPress !== 'tab' && this.keyPress !== 'shiftTab') {
              this.updateGridEditMode('Normal');
              this.isOnBatch = false;
            }
            this.enableToolbarItems('save');
            if (this.parent.frozenColumns > 0) {
              mRow = <HTMLTableRowElement>this.parent.grid.getMovableRows()[rowIndex];
              removeClass([mRow], ['e-editedrow', 'e-batchrow']);
              removeClass(mRow.querySelectorAll('.e-rowcell'), ['e-editedbatchcell', 'e-updatedtd']);
            }
            removeClass([row], ['e-editedrow', 'e-batchrow']);
            removeClass(row.querySelectorAll('.e-rowcell'), ['e-editedbatchcell', 'e-updatedtd']);
            this.parent.grid.focusModule.restoreFocus();
            editAction({ value: <ITreeData>args.rowData, action: 'edit' }, this.parent, this.isSelfReference,
                       this.addRowIndex, this.selectedIndex, args.columnName);
            let saveArgs: CellSaveEventArgs = {
              type: 'save', column: this.parent.getColumnByField(args.columnName), data: args.rowData,
              previousData: args.previousValue, row: row, target: (args.cell as HTMLElement)
            };
            this.parent.trigger(events.actionComplete, saveArgs);
          } else {
            this.parent.grid.isEdit = true;
          }
      }
    }

    private lastCellTab(formObj: Element): void {
      if (!this.parent.grid.isEdit && this.isOnBatch && this.keyPress === 'tab' && this.parent.editSettings.mode === 'Cell') {
        this.updateGridEditMode('Normal');
        this.isOnBatch = false;
        this.keyPress = null;
      }
    }

    private blazorTemplates(args: CellSaveArgs): void {
      if (isBlazor() && this.parent.isServerRendered) {
        let cols: Column[] = this.parent.grid.getColumns();
        let colModel: string = 'columnModel';
        let columnModel: Column[] = this.parent.grid[colModel];
        let str: string = 'isStringTemplate';
        for (let i: number = 0; i < cols.length; i++) {
          if (columnModel[i].template) {
            let templateID: string = this.parent.grid.element.id + cols[i].uid;
            columnModel[i].getColumnTemplate()(extend({ 'index': [i] }, args.rowData), this.parent.grid, 'template',
                                               templateID, this.parent.grid[str], null);
          }
          if (cols[i].editTemplate) {
            updateBlazorTemplate(this.parent.grid.element.id + cols[i].uid + 'editTemplate', 'EditTemplate', cols[i]);
          }
          if (cols[i].template) {
            updateBlazorTemplate(this.parent.grid.element.id + cols[i].uid, 'Template', cols[i], false);
          }
        }
      }
    }

    private updateCell(args: CellSaveArgs, rowIndex: number): void {
      this.parent.grid.editModule.updateRow(rowIndex, args.rowData);
      this.parent.grid.getRowsObject()[rowIndex].data = args.rowData;
     }
    private crudAction(details: { value: ITreeData, action: string }, columnName?: string): void {
      editAction(details, this.parent, this.isSelfReference, this.addRowIndex, this.selectedIndex, columnName, this.addRowRecord);
      this.parent.parentData = [];
      let data: Object = this.parent.grid.dataSource instanceof DataManager ?
      this.parent.grid.dataSource.dataSource.json : this.parent.grid.dataSource;
      for (let i: number = 0; i < (<Object[]>data).length; i++) {
        data[i].index = i;
        let key: string = this.parent.grid.getPrimaryKeyFieldNames()[0];
        if (details.value[key] === data[i][key]) {
          if (details.action === 'add') {
            data[i].level = this.internalProperties.level;
            data[i].taskData = this.internalProperties.taskData;
            data[i].uniqueID = this.internalProperties.uniqueID;
            if (!isNullOrUndefined(this.internalProperties.parentItem)) {
              data[i].parentItem = this.internalProperties.parentItem;
              data[i].parentUniqueID = this.internalProperties.parentUniqueID;
            }
            data[i].childRecords = this.internalProperties.childRecords;
          }
        }
        setValue('uniqueIDCollection.' + data[i].uniqueID + '.index', i, this.parent);
        if (!data[i].level) {
          this.parent.parentData.push(data[i]);
      }
      }
      if (details.action === 'add' && this.previousNewRowPosition != null) {
        this.parent.setProperties({editSettings: {newRowPosition:  this.previousNewRowPosition}}, true);
        this.previousNewRowPosition = null;
      }
    }
    private updateIndex (data: Object, rows: Object, records: Object): void {
      for (let j: number = 0; j < this.parent.getDataRows().length; j++ ) {
        let data1: ITreeData = records[j];
        let index: number = getValue('uniqueIDCollection.' + data1.uniqueID + '.index', this.parent);
        data1.index = index;
        if (!isNullOrUndefined(data1.parentItem)) {
          let parentIndex: number = getValue('uniqueIDCollection.' + data1.parentItem.uniqueID + '.index', this.parent);
          data1.parentItem.index = parentIndex;
        }
      }
      let count: number = -1;
      for (let k: number = 0; k < this.parent.getRows().length; k++) {
        if (!rows[k].classList.contains('e-detailrow')) {
          count++;
          }
        let data2: ITreeData = records[count];
        let index: number = data2.index;
        let level: number = data2.level;
        let row: Element = rows[k];
        if (!isNullOrUndefined(data2.parentItem)) {
          index = getValue('uniqueIDCollection.' + data2.parentItem.uniqueID + '.index', this.parent);
        }
        let treecell: HTMLElement = (row as HTMLTableRowElement).cells[this.parent.treeColumnIndex];
        for (let l: number = 0; l < treecell.classList.length; l++) {
          let value: string = treecell.classList[l];
          let remove: RegExp = /e-gridrowindex/i;
          let removed: RegExp = /e-griddetailrowindex/i;
          let result: RegExpMatchArray = value.match(remove);
          let results: RegExpMatchArray = value.match(removed);
          if (result != null) {
           removeClass([treecell], value);
          }
          if (results != null) {
            removeClass([treecell], value);
           }
        }
        if (!rows[k].classList.contains('e-detailrow')) {
          addClass([treecell], 'e-gridrowindex' + index + 'level' + level);
        }else {
          addClass([treecell], 'e-griddetailrowindex' + index + 'level' + level);
        }
      }
    }
    private beginAdd(args?: SaveEventArgs): void {
      let position: string;
      let index: number = this.addRowIndex;
      let records: Object[] = this.parent.grid.getCurrentViewRecords();
      if (this.parent.editSettings.mode === 'Batch') {
          index = this.batchEditModule.getAddRowIndex();
          this.selectedIndex = this.batchEditModule.getSelectedIndex();
          if (this.parent.getBatchChanges()[this.addedRecords].length > 1
              || this.parent.getBatchChanges()[this.deletedRecords].length) {
              records = this.batchEditModule.getBatchRecords();
          }
      }
      let rows: Element[] = this.parent.grid.getDataRows();
      if (this.parent.editSettings.mode !== 'Dialog') {
        if (this.parent.editSettings.newRowPosition === 'Above') {
          position = 'before';
        } else if ((this.parent.editSettings.newRowPosition === 'Below' ||
                    this.parent.editSettings.newRowPosition === 'Child')
          && this.selectedIndex > -1) {
          position = 'after';
          if (!isNullOrUndefined(records[index]) && (records[index] as ITreeData).expanded) {
            if (this.parent.editSettings.mode === 'Batch' && (this.parent.getBatchChanges()[this.addedRecords].length > 1
                || this.parent.getBatchChanges()[this.deletedRecords].length)) {
                index += findChildrenRecords(records[index]).length;
                if (this.parent.editSettings.newRowPosition !== 'Child') {
                    let batchChildCount: number = this.batchEditModule.getBatchChildCount();
                    index = index + batchChildCount;
                }
            } else {
              index += findChildrenRecords(records[index]).length;
            }
          }
        }
        if (this.selectedIndex > -1 && (index || (this.parent.editSettings.newRowPosition === 'Child'
          || this.parent.editSettings.newRowPosition === 'Below'))) {
          if (index >= rows.length) {
            index = rows.length - 2;
          }
          let r: string = 'rows';
          let newRowObject: Row<Column> =  this.parent.grid.contentModule[r][0];
          let focussedElement: HTMLInputElement = <HTMLInputElement>document.activeElement;
          rows[index + 1][position](rows[0]);
          setValue('batchIndex', index + 1, this.batchEditModule);
          let rowObjectIndex: number = this.parent.editSettings.newRowPosition  === 'Above' ? index : index + 1;
          this.parent.grid.contentModule[r].splice(0, 1);
          this.parent.grid.contentModule[r].splice(rowObjectIndex, 0, newRowObject);
          if (this.parent.frozenRows || this.parent.getFrozenColumns() || this.parent.frozenColumns) {
            let movableRows: Object[] = this.parent.getMovableDataRows();
            let frows: string = 'freezeRows';
            let newFreezeRowObject: Row<Column> = this.parent.grid.getRowsObject()[0];
            movableRows[index + 1][position](movableRows[0]);
            this.parent.grid.contentModule[frows].splice(0, 1);
            this.parent.grid.contentModule[frows].splice(rowObjectIndex, 0, newFreezeRowObject);
            setValue('batchIndex', index + 1, this.batchEditModule);
          }
          if (this.parent.editSettings.mode === 'Row' || this.parent.editSettings.mode === 'Cell') {
            let errors: NodeListOf<Element> = this.parent.grid.getContentTable().querySelectorAll('.e-griderror');
            for (let i: number = 0; i < errors.length; i++) {
              errors[i].remove();
            }
            setValue('errorRules', [], this.parent.grid.editModule.formObj);
          }
          focussedElement.focus();
        }
      }
    }
    // private beforeDataBound(args: BeforeDataBoundArgs): void {
    //   if (this.parent.grid.isEdit && this.parent.dataSource instanceof DataManager &&
    //         this.parent.dataSource.adaptor instanceof RemoteSaveAdaptor) {
    //     let action: string = getValue('action', args);
    //     let data: Object = getValue('data', args);
    //     if (action === 'edit' && !isNullOrUndefined(this.editedData)) {
    //       data = extend(this.editedData, data);
    //       this.editedData = null;
    //     }
    //     if (!isNullOrUndefined(this.addedData)) {
    //       let addedData: Object = args.result[args.result.length - 1];
    //       addedData = extend(this.addedData, addedData);
    //       this.addedData = null;
    //       args.result.splice(this.addedIndex, 0, addedData);
    //       args.result.splice(args.result.length, 1);
    //     }
    //   }
    // }
    private beginEdit(args: SaveEventArgs): void {
        if (args.requestType === 'refresh' && this.isOnBatch) {
          args.cancel = true; return;
        }
        if (this.parent.editSettings.mode === 'Cell' && args.requestType === 'beginEdit') {
          args.cancel = true; return;
        }
        if (this.doubleClickTarget && (this.doubleClickTarget.classList.contains('e-treegridexpand') ||
        this.doubleClickTarget.classList.contains('e-treegridcollapse') || this.doubleClickTarget.classList.contains('e-frame'))) {
          args.cancel = true; this.doubleClickTarget = null;
          return;
        }
        if (args.requestType === 'delete') {
            let data: ITreeData[] = <ITreeData[]>args.data;
            for (let i: number = 0; i < data.length; i++) {
              this.deleteUniqueID(data[i].uniqueID);
              let childs: ITreeData[] = findChildrenRecords(data[i]);
              for (let c: number = 0; c < childs.length; c++) {
                this.deleteUniqueID(childs[c].uniqueID);
              }
              args.data = [...data, ...childs];
            }
        }
        if (args.requestType === 'add') {
            this.selectedIndex = this.parent.grid.selectedRowIndex;
            this.addRowIndex = this.parent.grid.selectedRowIndex > -1 ? this.parent.grid.selectedRowIndex : 0;
            this.addRowRecord = this.parent.getSelectedRecords()[0];
        }
        args = this.beginAddEdit(args);
        // if (args.requestType === 'save' &&
        //    ((this.parent.dataSource instanceof DataManager && this.parent.dataSource.adaptor instanceof RemoteSaveAdaptor))) {
        //      if (args.action === 'edit') {
        //           this.editedData = args.data;
        //      } else if (args.action === 'add') {
        //           this.addedData = value;
        //      }

        // }
    }
    private savePreviousRowPosition(args: SaveEventArgs): void {
      if (this.previousNewRowPosition === null) {
         this.previousNewRowPosition = this.parent.editSettings.newRowPosition;
       }
  }
    private beginAddEdit(args: SaveEventArgs): SaveEventArgs {
      let value: ITreeData = args.data;
      if (args.action === 'add') {
          let key: string = this.parent.grid.getPrimaryKeyFieldNames()[0];
          let position: string = null;
          value.taskData = isNullOrUndefined(value.taskData) ? extend({}, args.data) : value.taskData;
          // let currentData: ITreeData[] = this.batchRecords.length ? this.batchRecords :
          //            <ITreeData[]>this.parent.grid.getCurrentViewRecords();
          let currentData: ITreeData[] = <ITreeData[]>this.parent.grid.getCurrentViewRecords();
          let index: number =  this.addRowIndex;
          value.uniqueID = getUid(this.parent.element.id + '_data_');
          setValue('uniqueIDCollection.' +  value.uniqueID , value, this.parent);
          let level: number; let dataIndex: number; let idMapping: Object;
          let parentUniqueID: string; let parentItem: Object; let parentIdMapping: string;
          if (currentData.length) {
              level = currentData[this.addRowIndex].level;
              dataIndex = currentData[this.addRowIndex].index;
              idMapping = currentData[this.addRowIndex][this.parent.idMapping];
              parentIdMapping = currentData[this.addRowIndex][this.parent.parentIdMapping];
              if (currentData[this.addRowIndex].parentItem) {
                parentUniqueID = currentData[this.addRowIndex].parentItem.uniqueID;
              }
              parentItem = currentData[this.addRowIndex].parentItem;
          }
          if (this.parent.editSettings.newRowPosition !== 'Top' && currentData.length) {
              if (this.parent.editSettings.newRowPosition === 'Above') {
                  position = 'before'; index = currentData[this.addRowIndex].index;
              } else if (this.parent.editSettings.newRowPosition === 'Below') {
                  position = 'after';
                  let childRecordCount: number = findChildrenRecords(currentData[this.addRowIndex]).length;
                  let currentDataIndex: number = currentData[this.addRowIndex].index;
                  index = (childRecordCount > 0) ? ( currentDataIndex + childRecordCount) : (currentDataIndex);
              } else if (this.parent.editSettings.newRowPosition === 'Child') {
                  position = 'after';
                  if (this.selectedIndex > -1) {
                    value.parentItem = extend({}, currentData[this.addRowIndex]);
                    value.parentUniqueID = value.parentItem.uniqueID;
                    delete value.parentItem.childRecords; delete value.parentItem[this.parent.childMapping];
                  }
                  let childRecordCount1: number = findChildrenRecords(currentData[this.addRowIndex]).length;
                  let currentDataIndex1: number = currentData[this.addRowIndex].index;
                  index = (childRecordCount1 > 0) ? ( currentDataIndex1 + childRecordCount1) : (currentDataIndex1);
                  value.level = level + 1;
                  if (this.isSelfReference) {
                      value.taskData[this.parent.parentIdMapping] = value[this.parent.parentIdMapping] = idMapping;
                      if (!isNullOrUndefined(value.parentItem)) {
                        updateParentRow(key, value.parentItem, 'add', this.parent, this.isSelfReference, value);
                      }
                  }
              }
              if (this.parent.editSettings.newRowPosition === 'Above' || this.parent.editSettings.newRowPosition === 'Below') {
                if (this.selectedIndex > -1 && level) {
                  value.parentUniqueID = parentUniqueID; value.parentItem = extend({}, parentItem);
                  delete value.parentItem.childRecords; delete value.parentItem[this.parent.childMapping];
                }
                value.level = level;
                if (this.isSelfReference) {
                  value.taskData[this.parent.parentIdMapping] = value[this.parent.parentIdMapping] = parentIdMapping;
                  if (!isNullOrUndefined(value.parentItem)) {
                    updateParentRow(key, value.parentItem, 'add', this.parent, this.isSelfReference, value);
                  }
              }
              }
              if (position != null && this.selectedIndex > -1) {
                  args.index = position === 'before' ? index : index + 1;
              }
              if (this.parent.editSettings.newRowPosition === 'Bottom') {
                let dataSource: Object[] = <Object[]>(this.parent.grid.dataSource instanceof DataManager ?
                           this.parent.grid.dataSource.dataSource.json : this.parent.grid.dataSource);
                args.index = dataSource.length;
              }
          }
          if (isNullOrUndefined(value.level)) {
            value.level = level;
          }
          // this.addedIndex = args.index;
          value.hasChildRecords = false; value.childRecords = []; value.index = 0;
      }
      if (args.action === 'add') {
        this.internalProperties = { level: value.level, parentItem: value.parentItem, uniqueID: value.uniqueID,
          taskData: value.taskData, parentUniqueID: isNullOrUndefined(value.parentItem) ? undefined : value.parentItem.uniqueID,
          childRecords: value.childRecords };
      }
      if (args.requestType === 'delete') {
        let deletedValues: ITreeData[] = args.data as Object[];
        for (let i: number = 0; i < deletedValues.length; i++) {
          if (deletedValues[i].parentItem) {
            let parentItem: ITreeData = getParentData(this.parent, deletedValues[i].parentItem.uniqueID);
            if (!isNullOrUndefined(parentItem) && parentItem.hasChildRecords) {
              let childIndex: number = parentItem.childRecords.indexOf(deletedValues[i]);
              parentItem.childRecords.splice(childIndex, 1);
            }
          }
        }
      }
      return args;
    }


  /**
   * If the data,index and position given, Adds the record to treegrid rows otherwise it will create edit form.
   * @return {void}
   */

     public addRecord(data?: Object, index?: number, position?: RowPosition): void {
      this.previousNewRowPosition = this.parent.editSettings.newRowPosition;
      if (data) {
        if (index > -1 ) {
          this.selectedIndex = index;
          this.addRowIndex = index;
        } else {
          this.selectedIndex = this.parent.selectedRowIndex;
          this.addRowIndex = this.parent.selectedRowIndex;
        }
        if (position) {
          this.parent.setProperties({editSettings: {newRowPosition:  position}}, true);
        }
        this.parent.grid.editModule.addRecord(data, index);
      } else {
      this.parent.grid.editModule.addRecord(data, index);
      }
    }

    /**
     * Checks the status of validation at the time of editing. If validation is passed, it returns true.
     * @return {boolean}
     */
    public editFormValidate(): boolean {
      return this.parent.grid.editModule.editFormValidate();
    }

    /**
     * @hidden
     */
    public destroyForm(): void {
      this.parent.grid.editModule.destroyForm();
  }

  private contentready (e: { rows: Row<Column>[], args?: NotifyArgs }): void {
    if (!isNullOrUndefined(e.args.requestType)
      && (e.args.requestType.toString() === 'delete' || e.args.requestType.toString() === 'save'
        || (this.parent.editSettings.mode === 'Batch' && e.args.requestType.toString() === 'batchsave'))) {
      this.updateIndex(this.parent.grid.dataSource, this.parent.getRows(), this.parent.getCurrentViewRecords());
      if (this.parent.frozenRows || this.parent.getFrozenColumns() || this.parent.frozenColumns) {
        if ((this.parent.grid.dataSource as Object[]).length === this.parent.getMovableDataRows().length) {
          this.updateIndex(this.parent.grid.dataSource, this.parent.getMovableDataRows(), this.parent.getCurrentViewRecords());
        }
      }
    }
  }

    /**
     * If the row index and field is given, edits the particular cell in a row.
     * @return {void}
     */

    public editCell(rowIndex?: number, field?: string): void {
      if (this.parent.editSettings.mode === 'Cell' || this.parent.editSettings.mode === 'Batch') {
        if (this.parent.editSettings.mode !== 'Batch') {
          this.isOnBatch = true;
          this.updateGridEditMode('Batch');
        }
        this.parent.grid.editModule.editCell(rowIndex, field);
      }
    }
}