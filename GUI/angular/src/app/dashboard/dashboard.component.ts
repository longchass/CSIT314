import { AfterViewInit, Component, OnInit } from "@angular/core";
import * as _ from "lodash";
import * as XLSX from "xlsx";
import defaultCategories from "../categories/default-categories.json";
// Select and generate test data
// Size of the input size (csv file)
// Failure rate, how to implement this idea
// Passing input, failing input
// Failure rate = 1%, 99% of 1 milion
// Finite and infinite inputs
// Show speed of failure detection
// Can compare RT and ART
// Cluster or not clustered, if clustered art should be better, than rt.
// Test oracle, for generating input, it's up to us to decide.
// Validate if the result is correct.
// Use fuzzer, A4 or anything like that.
// You define what program you want to test. Users do not enter failing test cases.

interface ICategory {
  category: string;
  choices: string[];
}

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  public boxPlotGraph: any = {
    data: [],
    layout: { autosize: true, title: "ART vs RT" },
  };
  public lineGraph: any = {
    data: [],
    layout: { autosize: true, title: "ART vs RT" },
  };
  public categories: ICategory[] = [];
  public displayedColumns = ["category", "choices"];
  public numberOfCom: number = 100;
  public failureRate: number = 0.01;
  public rtWinCount: number = 0;
  public artWinCount: number = 0;
  public drawCount: number = 0;
  public loading = false;
  public xlsxData: any[];

  ngAfterViewInit() {}

  constructor() {}

  public loadSavedCategories() {
    let categories = localStorage.getItem("categories");
    if (categories === null || categories === undefined) {
      categories = JSON.stringify(defaultCategories);
      localStorage.setItem("categories", categories);
    }
    this.categories = JSON.parse(categories);
  }

  public onFileChange(event: any) {
    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>event.target;
    if (target.files.length !== 1) {
      throw new Error("Cannot use multiple files");
    }
    const reader: FileReader = new FileReader();
    reader.readAsBinaryString(target.files[0]);
    reader.onload = (e: any) => {
      /* create workbook */
      const binarystr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(binarystr, { type: "binary" });

      /* selected the first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      const data = XLSX.utils.sheet_to_json(ws);
      this.xlsxData = data;
    };
  }

  public async runWithFile() {
    this.loading = true;
    this.artWinCount = 0;
    this.rtWinCount = 0;
    this.drawCount = 0;
    const numberOfCom = this.numberOfCom;
    // Build categories
    const categories = [];
    const xlsxData = _.cloneDeep(this.xlsxData);

    for (let item of xlsxData) {
      for (let cat in item) {
        if (cat === "[failure]") continue;
        const category = categories.find((item) => item.category === cat);
        const choice = String(_.get(item, cat));
        if (!category) {
          const newCat: ICategory = {
            category: cat,
            choices: [choice],
          };
          categories.push(newCat);
        } else if (!category.choices.find((item) => item === choice))
          category.choices.push(choice);
      }
    }

    // Failure Region
    let failureRegion = xlsxData
      .filter((item) => _.get(item, "[failure]") === true)
      .map((item) => {
        for (let att in item) _.set(item, att, String(_.get(item, att)));
        return item;
      });
    failureRegion = failureRegion.map((row) => _.omit(row, ["[failure]"]));

    // All possible cases
    const allCases = xlsxData
      .map((row) => _.omit(row, ["[failure]"]))
      .map((item) => {
        for (let att in item) _.set(item, att, String(_.get(item, att)));
        return item;
      });
    console.log(allCases);
    console.log(failureRegion);

    if (typeof Worker !== "undefined") {
      // Create a new
      const worker = new Worker("../art-calculation.worker", {
        type: "module",
      });
      worker.onmessage = ({ data }) => {
        if (data.type === "final") {
          console.log("Result");
          console.log(data);
          const artFCount = data.result.artFCount;
          const rtFCount = data.result.rtFCount;
          this.artWinCount = data.result.artWinCount;
          this.rtWinCount = data.result.rtWinCount;
          this.setupBoxPlotGraph(artFCount, rtFCount);
          this.setupLineGraph(artFCount, rtFCount);
          this.loading = false;
        } else if (data.type === "art_win_update") {
          this.artWinCount = data.artWinCount;
        } else if (data.type === "rt_win_update") {
          this.rtWinCount = data.rtWinCount;
        } else if (data.type === "draw_update") {
          this.drawCount = data.drawCount;
        }
      };

      const workerInput = {
        categories: categories,
        numberOfCom: numberOfCom,
        posCases: allCases,
        failureRegion: failureRegion,
      };
      console.log(workerInput);
      worker.postMessage(JSON.stringify(workerInput));
    } else {
      // Web workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  public async run() {
    this.loading = true;
    this.artWinCount = 0;
    this.rtWinCount = 0;
    this.drawCount = 0;
    const failureRate = this.failureRate;
    const numberOfCom = this.numberOfCom;
    const categories = this.categories;
    let numOfPos = 1;
    categories.forEach((item) => (numOfPos *= item.choices.length));

    if (typeof Worker !== "undefined") {
      // Create a new
      const worker = new Worker("../art-calculation.worker", {
        type: "module",
      });
      worker.onmessage = ({ data }) => {
        if (data.type === "final") {
          console.log("Result");
          console.log(data);
          const artFCount = data.result.artFCount;
          const rtFCount = data.result.rtFCount;
          this.artWinCount = data.result.artWinCount;
          this.rtWinCount = data.result.rtWinCount;
          this.setupBoxPlotGraph(artFCount, rtFCount);
          this.setupLineGraph(artFCount, rtFCount);
          this.loading = false;
        } else if (data.type === "art_win_update") {
          this.artWinCount = data.artWinCount;
        } else if (data.type === "rt_win_update") {
          this.rtWinCount = data.rtWinCount;
        } else if (data.type === "draw_update") {
          this.drawCount = data.drawCount;
        }
      };

      const workerInput = {
        categories: categories,
        numberOfCom: numberOfCom,
        failureRate: failureRate,
        numOfPos: numOfPos,
      };
      console.log("Input: ");
      console.log(workerInput);
      worker.postMessage(JSON.stringify(workerInput));
    } else {
      // Web workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  public setupLineGraph(artFCount: number[], rtFCount: number[]) {
    // Setup box plot
    const artBoxPlotData = {
      y: artFCount,
      type: "scatter",
      name: "ART",
    };
    const rtBoxPlotData = {
      y: rtFCount,
      type: "scatter",
      name: "RT",
    };
    const graph = {
      data: [artBoxPlotData, rtBoxPlotData],
      layout: { title: "ART vs RT (F-Measure)", autosize: true },
    };
    this.lineGraph = graph;
  }

  public setupBoxPlotGraph(artFCount: number[], rtFCount: number[]) {
    // Setup box plot
    const artBoxPlotData = {
      x: artFCount,
      type: "box",
      name: "ART",
    };
    const rtBoxPlotData = {
      x: rtFCount,
      type: "box",
      name: "RT",
    };
    const graph = {
      data: [artBoxPlotData, rtBoxPlotData],
      layout: { autosize: true, title: "ART vs RT (F-Measure)" },
    };
    this.boxPlotGraph = graph;
  }

  public async ngOnInit() {
    this.loadSavedCategories();
  }
}
