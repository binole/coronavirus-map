const H = window.H;

const platform = new H.service.Platform({
  apikey: 'LEKWHSBws2AdMq7AOzft6cGDIfT9c3p8VIuQFvwLdp4'
});

const defaultLayers = platform.createDefaultLayers();

const map = new H.Map(
  document.getElementById('map'),
  defaultLayers.vector.normal.map,
  {
    center: { lat: 30.5684073, lng: 114.0201923 },
    zoom: 3,
    pixelRatio: window.devicePixelRatio || 1
  }
);

new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

const ui = H.ui.UI.createDefault(map, defaultLayers);

const group = new H.map.Group();

map.addObject(group);

group.addEventListener('tap', onMarkerTapped, false);

function onMarkerTapped(evt) {
  if (activeBubble) {
    activeBubble.close();
  }

  const bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
    content: evt.target.getData()
  });

  ui.addBubble(bubble);

  activeBubble = bubble;
}

export const addMarkers = makeAddMarkers(group);
export const removeAllMarkers = makeRemoveAllMarkers(group);

let activeBubble;

window.addEventListener('resize', () => map.getViewPort().resize());

export function getCachedResults() {
  return new Promise(resolve => {
    const data = require('./data.json');

    resolve(serializeResults(data));
  });
}

export function fetchResults() {
  return fetch('https://lab.isaaclin.cn/nCoV/api/area?latest=1')
    .then(res => res.json())
    .then(serializeResults);
}

function serializeResults(res) {
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
}

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

function addMarkerToGroup(
  group,
  { lat, lng, province, country, confirmedCount, deadCount, curedCount }
) {
  const iconEl = createMarker(confirmedCount);

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

function createMarker(radius) {
  const iconEl = document.createElement('div');

  iconEl.className = 'circle';
  iconEl.style.width = radius + 'px';
  iconEl.style.height = radius + 'px';
  iconEl.innerHTML = radius;

  return iconEl;
}

function formatNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function makeAddMarkers(group) {
  return res =>
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
          cities.forEach(
            ({ cityEnglishName, confirmedCount, deadCount, curedCount }) => {
              searchLocation(
                {
                  province: cityEnglishName,
                  country,
                  deadCount,
                  curedCount
                },
                pos => {
                  pos.forEach(({ latitude, longitude }) => {
                    addMarkerToGroup(group, {
                      lat: latitude,
                      lng: longitude,
                      province: cityEnglishName,
                      country,
                      confirmedCount,
                      deadCount,
                      curedCount
                    });
                  });
                }
              );
            }
          );
        }
      }
    );
}

function makeRemoveAllMarkers(group) {
  return () => {
    group.removeAll();
  };
}
