import React from 'react';
import {
  getCachedResults,
  fetchResults,
  removeAllMarkers,
  addMarkers
} from './map';

export default function App() {
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    getCachedResults().then(res => {
      setResults(res);
    });

    fetchResults().then(res => {
      setResults(res);
    });
  }, []);

  React.useEffect(() => {
    if (!results.length) return;

    removeAllMarkers();
    addMarkers(results);
  }, [results]);

  return <div className='App'></div>;
}
