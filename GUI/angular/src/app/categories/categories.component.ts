import { Component, OnInit } from "@angular/core";
import { ColumnApi, GridApi } from "ag-grid-community";
import defaultCategories from "./default-categories.json";

@Component({
  selector: "app-categories",
  templateUrl: "./categories.component.html",
  // styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  public columnDefs = [
    {
      headerName: "Category",
      field: "category",
      editable: true,
      resizable: true,
      checkboxSelection: true,
    },
    {
      headerName: "Choices",
      field: "choices",
      editable: true,
      resizable: true,
    },
  ];
  public columnApi: ColumnApi;
  public gridApi: GridApi;
  public rowData = [];
  public selectedCategory: any;

  constructor() {}

  public addCategory() {
    const newCategory = {
      category: "",
      choices: []
    };
    this.rowData.push(newCategory);
    this.gridApi.applyTransaction({ add: [newCategory] });
  }

  public onSelectionChanged(event: any) {
    this.selectedCategory = this.gridApi.getSelectedRows()[0];
    console.log(this.selectedCategory);
  }

  public deleteCategory() {
    if (!this.selectedCategory) return;
    this.rowData = this.rowData.filter(item => JSON.stringify(item) !== JSON.stringify(this.selectedCategory));
    this.gridApi.applyTransaction({ remove: [this.selectedCategory] });
    this.updateCategories();
  }

  ngOnInit() {
    this.loadSavedCategories();
  }

  public onGridReady(params: { columnApi: ColumnApi; api: GridApi }): void {
    this.columnApi = params.columnApi;
    this.gridApi = params.api;
    this.autoSizeAll();
  }

  public autoSizeAll(): void {
    const allColumnIds = this.columnApi
      .getAllColumns()
      .map((column) => column.getColId());
    this.columnApi.autoSizeColumns(allColumnIds);
  }

  public updateCategories(event?) {
    const saveData = this.rowData.map((item) => {
      if (!Array.isArray(item.choices)) item.choices = item.choices.split(",");
      return item;
    });
    localStorage.setItem("categories", JSON.stringify(saveData));
  }

  public loadSavedCategories() {
    let categories = localStorage.getItem("categories");
    if (categories === null || categories === undefined) {
      categories = JSON.stringify(defaultCategories);
      localStorage.setItem("categories", JSON.stringify(categories));
    }
    this.rowData = JSON.parse(categories);
  }
}
