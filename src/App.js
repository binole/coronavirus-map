import React from 'react';
import './App.css';

const H = window.H;

const platform = new H.service.Platform({
  apikey: 'LEKWHSBws2AdMq7AOzft6cGDIfT9c3p8VIuQFvwLdp4'
});

const defaultLayers = platform.createDefaultLayers();

function geoCode(geocodingParameters, onSuccess) {
  const geocoder = platform.getGeocodingService();

  return geocoder.geocode(geocodingParameters, onSuccess);
}

function searchLocation({ province, country }, onSuccess) {
  const provinceIsCountry = province === country;

  const geocodingParameters = provinceIsCountry
    ? { country }
    : { searchText: `${province}, ${country}` };

  geoCode({ ...geocodingParameters, jsonattributes: 1 }, res => {
    const pos = res.response.view.flatMap(v =>
      v.result.flatMap(r => r.location.displayPosition)
    );

    onSuccess(pos);
  });
}

function getCachedResults() {
  return new Promise(resolve => {
    const data = require('./data.json');
    const parsedData = data.results.map(
      ({
        countryEnglishName,
        provinceName,
        provinceEnglishName,
        confirmedCount,
        deadCount,
        curedCount,
        cities
      }) => ({
        province: provinceEnglishName || provinceName,
        country: countryEnglishName,
        cities,
        confirmedCount,
        deadCount,
        curedCount
      })
    );

    resolve(parsedData);
  });
}

function fetchResults() {
  return fetch('https://lab.isaaclin.cn/nCoV/api/area?latest=1')
    .then(res => res.json())
    .then(res => {
      return res.results.map(
        ({
          countryEnglishName,
          provinceName,
          provinceEnglishName,
          confirmedCount,
          deadCount,
          curedCount,
          cities
        }) => ({
          province: provinceEnglishName || provinceName,
          country: countryEnglishName,
          cities,
          confirmedCount,
          deadCount,
          curedCount
        })
      );
    });
}

function addMarkerToGroup(
  group,
  { lat, lng, province, country, confirmedCount, deadCount, curedCount }
) {
  const iconEl = document.createElement('div', { className: 'circle' });

  iconEl.className = 'circle';
  iconEl.style.width = confirmedCount / 10 + 'px';
  iconEl.style.height = confirmedCount / 10 + 'px';
  iconEl.innerHTML = confirmedCount;

  const domIcon = new H.map.DomIcon(iconEl);

  const marker = new H.map.DomMarker({ lat, lng }, { icon: domIcon });

  group.addObject(marker);
  marker.setData(`
    <div class='info'>
      <div class='info__header'>
        <strong class='info__province'>${province}</strong>
        ${province === country ? '' : `<div>${country}</div>`}
      </div>
      <div class='info__content'>
        <div class='col'>
          <div class='info__label'>Ca ghi nhận</div>
          <div><strong class='info__stat color-warn'>${formatNumber(
            confirmedCount
          )}</strong></div>
        </div>
        <div class='col'>
          <div class='info__label'>Tử vong</div>
          <div><strong class='info__stat color-died'>${formatNumber(
            deadCount
          )}</strong></div>
        </div>
        <div class='col'>
          <div class='info__label'>Hồi phục</div>
          <div><strong class='info__stat color-cured'>${formatNumber(
            curedCount
          )}</strong></div>
        </div>
      </div>
    </div>
  `);
}

function formatNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function App() {
  const mapRef = React.createRef();
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    getCachedResults().then(res => {
      setResults(res);
    });
  }, []);

  React.useEffect(() => {
    fetchResults().then(res => {
      setResults(res);
    });
  }, []);

  React.useEffect(() => {
    if (!results.length) return;

    const map = new H.Map(mapRef.current, defaultLayers.vector.normal.map, {
      center: { lat: 30.5684073, lng: 114.0201923 },
      zoom: 3,
      pixelRatio: window.devicePixelRatio || 1
    });

    new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

    const ui = H.ui.UI.createDefault(map, defaultLayers);

    window.addEventListener('resize', () => map.getViewPort().resize());

    const group = new H.map.Group();

    let activeBubble;

    map.addObject(group);

    group.addEventListener(
      'tap',
      evt => {
        if (activeBubble) {
          activeBubble.close();
        }

        const bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
          content: evt.target.getData()
        });

        ui.addBubble(bubble);

        activeBubble = bubble;
      },
      false
    );

    renderResults(results);

    function renderResults(res) {
      res.forEach(
        ({
          province,
          country,
          confirmedCount,
          deadCount,
          curedCount,
          cities
        }) => {
          searchLocation({ province, country }, pos => {
            pos.forEach(({ latitude, longitude }) => {
              addMarkerToGroup(group, {
                lat: latitude,
                lng: longitude,
                confirmedCount,
                province,
                country,
                deadCount,
                curedCount
              });
            });
          });

          if (cities && cities.length > 0) {
            cities.forEach(({ cityEnglishName, confirmedCount }) => {
              searchLocation(
                { province: cityEnglishName, country, deadCount, curedCount },
                pos => {
                  pos.forEach(({ latitude, longitude }) => {
                    addMarkerToGroup(group, {
                      lat: latitude,
                      lng: longitude,
                      confirmedCount,
                      province: cityEnglishName,
                      country,
                      deadCount,
                      curedCount
                    });
                  });
                }
              );
            });
          }
        }
      );
    }
  }, [mapRef, results]);

  return (
    <div className='App'>
      <div id='map' ref={mapRef}></div>
    </div>
  );
}

export default App;
