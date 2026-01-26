export class CrawlerRunMetricDto {
	// between 0-100
	progress?: number;
	crawledDataSets?: number;
	cacheHits?: number;
	totalDatasetsToDownload?: number;
	downloadedDatasets?: number;
	totalGBToDownload?: number;
	downloadedGB?: number;
}
