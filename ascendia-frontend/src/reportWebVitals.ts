import { ReportHandler } from 'web-vitals';

type LoadMetrics = () => Promise<typeof import('web-vitals')>;

export const loadWebVitals: LoadMetrics = () => import('web-vitals');

const reportWebVitals = (onPerfEntry?: ReportHandler, loadMetrics: LoadMetrics = loadWebVitals) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    return loadMetrics().then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }

  return undefined;
};

export default reportWebVitals;
