import { pollCallSuccess, downloadFile, enableDialogDragging, removeElementChildren, disableNthChild } from "../common";
import { process as htmxProcess } from "htmx.org";


type packageData = {
  sgmc_geology_major_1: string[],
  sgmc_geology_major_2: string[],
  sgmc_geology_major_3: string[],
  sgmc_geology_minor_1: string[],
  sgmc_geology_minor_2: string[],
  sgmc_geology_minor_3: string[],
  sgmc_geology_minor_4: string[],
  sgmc_geology_minor_5: string[],
  cma_id?: string
};


const dialog = document.getElementById("download-package-dialog")
const dialogContents = dialog.querySelector(".modal-box");
const dialogTitle = document.getElementById("download-title");

enableDialogDragging(dialog, dialogContents, dialogTitle);

/**
 * Given an array of previously generated feature-layer-urls, return
 * an object that groups attributes as backend expects them on the POST
 * payload.
 */
export function createPackagingData(layerUrl: string): packageData {
  const [_, queryString] = layerUrl.split("?");
  const params = new URLSearchParams(queryString);
  const dataAcc: packageData = {
    sgmc_geology_major_1: [],
    sgmc_geology_major_2: [],
    sgmc_geology_major_3: [],
    sgmc_geology_minor_1: [],
    sgmc_geology_minor_2: [],
    sgmc_geology_minor_3: [],
    sgmc_geology_minor_4: [],
    sgmc_geology_minor_5: [],
  };

  // Major Geology types
  if (params.has("sgmc_geology_major_1")) {
    dataAcc.sgmc_geology_major_1 = [params.get("sgmc_geology_major_1")];
  }
  if (params.has("sgmc_geology_major_2")) {
    dataAcc.sgmc_geology_major_2 = [params.get("sgmc_geology_major_2")];
  }
  if (params.has("sgmc_geology_major_3")) {
    dataAcc.sgmc_geology_major_3 = [params.get("sgmc_geology_major_3")];
  }

  // Minor Geology types
  if (params.has("sgmc_geology_minor_1")) {
    dataAcc.sgmc_geology_minor_1 = [params.get("sgmc_geology_minor_1")];
  }
  if (params.has("sgmc_geology_minor_2")) {
    dataAcc.sgmc_geology_minor_2 = [params.get("sgmc_geology_minor_2")];
  }
  if (params.has("sgmc_geology_minor_3")) {
    dataAcc.sgmc_geology_minor_3 = [params.get("sgmc_geology_minor_3")];
  }
  if (params.has("sgmc_geology_minor_4")) {
    dataAcc.sgmc_geology_minor_4 = [params.get("sgmc_geology_minor_4")];
  }
  if (params.has("sgmc_geology_minor_5")) {
    dataAcc.sgmc_geology_minor_5 = [params.get("sgmc_geology_minor_5")]
  }

  // CMA ID
  if (params.has("cma_id")) {
    dataAcc.cma_id = params.get("cma_id");
  }

  return dataAcc;
}

/**
 * We go from a layer_url -> packageData, and here we use packageData to
 * generate a fileName for the geopackage download using input from the user.
 */
export function filenameFromPackageData(data: packageData) {
  const {
    cma_id,
    sgmc_geology_major_1,
    sgmc_geology_major_2,
    sgmc_geology_major_3,
    sgmc_geology_minor_1,
    sgmc_geology_minor_2,
    sgmc_geology_minor_3,
    sgmc_geology_minor_4,
    sgmc_geology_minor_5,
  } = data;
  let filename = "";

  // If cma_id is present, extract and add to the filename
  if (cma_id) {
    const split_arr = cma_id.split("_");
    const cma_name = split_arr[split_arr.length - 1];
    filename += `cma-${cma_name}-`;
  }

  // Collect all the geology values (major and minor) into one array
  const allGeologyValues = [
    ...sgmc_geology_major_1,
    ...sgmc_geology_major_2,
    ...sgmc_geology_major_3,
    ...sgmc_geology_minor_1,
    ...sgmc_geology_minor_2,
    ...sgmc_geology_minor_3,
    ...sgmc_geology_minor_4,
    ...sgmc_geology_minor_5,
  ];

  const geologyString = allGeologyValues
    .map((value) => value.toLowerCase().replace(/\s+/g, ''))
    .join("_");

  filename += `${geologyString}`;

  return `${filename}.zip`;
}

/**
 * TODO this needs to be refactored.
 */
export function createPackagingJobs(layerUrls) {

  const jobStatusSpan = document.getElementById("job-count-status");
  const dialogTitleText = dialogTitle.querySelector("h3");
  const failedList = document.getElementById("failed-job-ids");
  const packageCaption = document.getElementById("download-package-caption");
  const alertMessage = dialog.querySelector(".alert > span");
  const jobStatusBreakdown = dialog.querySelector(".job-status-breakdown");

  let filenames = [];

  const reqPromises = layerUrls.map(layerUrl => {
    const data = createPackagingData(layerUrl);

    filenames.push(filenameFromPackageData(data));

    return fetch(window.download_feature_package_uri, {
      method: "post",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
  });

  const jobCount = reqPromises.length;
  let failed = 0;
  let success = 0;
  let noMatch = [];
  const failedJobs = [];

  jobStatusSpan.textContent = `${jobCount} package(s) queued for creation.`;

  const finalPromises = reqPromises.map((job_promise, idx) => {
    return job_promise.then(async (job_id) => {

      const statusUrl = `${window.job_status_uris[0]}?job_id=${job_id}`;
      const resultUrl = `${window.job_status_uris[1]}?job_id=${job_id}`;
      const fileName = filenames[idx];

      jobStatusBreakdown.insertAdjacentHTML("beforeend", `
        <div hx-trigger="load delay:2s" 
            hx-get="/features/job-status-tracker?job_id=${job_id}&title=${fileName}&job_type=download"
            hx-swap="outerHTML"
            >
        </div>
        `);
      htmxProcess(jobStatusBreakdown);

      try {
        await pollCallSuccess(statusUrl, 5000);

        const r = await fetch(resultUrl);
        const jsonJobResult = await r.json();
        const url = jsonJobResult?.result?.download_url;

        if (jsonJobResult.state === "success" && !url) {
          noMatch.push(fileName);
        } else if (jsonJobResult.state !== "success") {
          throw new Error(`${jsonJobResult?.state}, ${JSON.stringify(jsonJobResult?.result)}`);
        } else {
          downloadFile(url, fileName);
          success += 1;

          disableNthChild(jobStatusBreakdown, idx, true);
        }
      } catch (e) {
        failed += 1;
        failedJobs.push({ id: job_id, reason: e.message });
        return false;
      }
    });
  });

  Promise.all(finalPromises).then(() => {

    packageCaption.classList.add("hidden");

    if (failed) { // Any failed..
      jobStatusSpan.textContent = "Package creation failed.";
      dialogTitle.classList.remove("bg-info");
      dialogTitle.classList.add("bg-error");
      dialogTitleText.textContent = "An Unexpected Error Ocurred";

      alertMessage.parentElement.classList.add("hidden");

      failedJobs.forEach(d => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="text-info">${d.id}</span>: <span class="text-error">${d.reason}</span>`;
        failedList.appendChild(li);
      });
      jobStatusSpan.textContent += " You may use the CDR API to check for additional details for the following job IDs:"
      failedList.classList.add("mb-4");
    } else if (noMatch.length < jobCount) {
      jobStatusSpan.textContent = "";
      alertMessage.textContent = "Your browser will start downloads for successful packages soon. Wait until completed, then check your downloads folder."
      dialogTitle.classList.remove("bg-info");
      dialogTitle.classList.add("bg-success");
      dialogTitleText.textContent = "Packages Created";
    } else {
      jobStatusSpan.textContent = "";
      alertMessage.parentElement.classList.add("hidden");
      dialogTitle.classList.remove("bg-info");
      dialogTitle.classList.add("bg-warning");
      dialogTitleText.textContent = "No Features Found";
    }

    if (noMatch.length) {
      jobStatusSpan.textContent = "The following package files did not match the search criteria in the CDR:";
      failedList.classList.add("mb-4");
      jobStatusBreakdown.classList.add("hidden");
    } else {
      dialog.querySelector(".loading").parentElement.classList.add("hidden");
    }
    noMatch.forEach(no_match_filename => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${no_match_filename}</span>`;
      failedList.appendChild(li);
    });

    dialog.querySelector(".modal-action").classList.remove("hidden");
    dialog.querySelector(".loading").classList.add("hidden");
  });

  dialog.classList.add("modal-open");

  // remove pointer events from form
  document.getElementById("features-main-pane").style["pointer-events"] = "none";

  // close dialog handler, reset
  dialog.querySelector(".modal-action > button")
    .addEventListener("click", () => {

      // add pointer events back to form
      document.getElementById("features-main-pane").style["pointer-events"] = "unset";

      dialog.classList.remove("modal-open");
      dialog.querySelector(".loading").classList.remove("hidden");
      dialog.querySelector(".loading").parentElement.classList.remove("hidden");
      dialog.querySelector(".modal-action").classList.add("hidden");
      jobStatusBreakdown.classList.remove("hidden");

      dialogTitle.classList.remove("bg-success", "bg-error", "bg-warning");
      dialogTitle.classList.add("bg-info");

      alertMessage.parentElement.classList.remove("hidden");
      alertMessage.textContent = "You may open a new tab to continue using polymer."

      dialogTitleText.textContent = "Preparing Packages";
      packageCaption.classList.remove("hidden");

      removeElementChildren(jobStatusBreakdown);
      removeElementChildren(failedList);
    });
}
