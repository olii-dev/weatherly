const LOCATIONIQ_API_KEY = "pk.8dee3ad385bf6bb40cc97f489f8711a0";

document.addEventListener("DOMContentLoaded", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getWeatherByCoords, (error) => {
            console.log("Geolocation denied. Allowing manual search.");
            alert("Unable to get your location. You can search for a city manually.");
            document.getElementById("searchContainer").style.display = "block";
        });
    } else {
        console.log("Geolocation not supported.");
        alert("Your browser does not support geolocation. Please use the manual search.");
        document.getElementById("searchContainer").style.display = "block";
    }

    document.getElementById("toggleSearch").addEventListener("click", () => {
        let searchContainer = document.getElementById("searchContainer");
        searchContainer.style.display = searchContainer.style.display === "none" ? "block" : "none";
    });

    document.getElementById("searchButton").addEventListener("click", () => {
        let city = document.getElementById("cityInput").value;
        if (city) {
            getWeatherByCity(city);
        } else {
            alert("Please enter a city name.");
        }
    });
});

async function getWeatherByCoords(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    try {
        let geoResponse = await fetch(`https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`);
        if (!geoResponse.ok) throw new Error("Error fetching location name");

        let geoData = await geoResponse.json();
        let locationName = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || geoData.address.state || "Unknown Location";

        if (locationName === "Adelaide" && geoData.address.city_district) {
            locationName = geoData.address.city_district;
        }

        document.getElementById("weatherDisplay").innerHTML = "Loading Weather...";
        fetchWeather(lat, lon, locationName);
    } catch (error) {
        alert(error.message);
    }
}

async function getWeatherByCity(city) {
    try {
        let geoResponse = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${city}&format=json`);
        if (!geoResponse.ok) throw new Error("Error fetching location data");

        let geoData = await geoResponse.json();
        if (geoData.length === 0) throw new Error("City not found");

        let { lat, lon } = geoData[0];
        let locationName = geoData[0].display_name;

        document.getElementById("weatherDisplay").innerHTML = "Loading Weather...";
        fetchWeather(lat, lon, locationName);
    } catch (error) {
        alert(error.message);
    }
}

async function fetchWeather(lat, lon, locationName) {
    try {
        let weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation_probability,uv_index,windspeed_10m,relativehumidity_2m,pressure_msl&timezone=auto`);
        if (!weatherResponse.ok) throw new Error("Error fetching weather data");

        let weatherData = await weatherResponse.json();
        let currentWeather = weatherData.current_weather;
        let hourlyForecast = weatherData.hourly;

        let now = new Date();
        let fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        let forecastTimes = hourlyForecast.time.filter(time => {
            let date = new Date(time);
            return date > now && date <= fourHoursLater;
        });

        let forecastHTML = forecastTimes.map((time, index) => {
            let timeIndex = hourlyForecast.time.indexOf(time);
            return `
                <div class="hourly-forecast">
                    <p class="time">${new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Temp: ${hourlyForecast.temperature_2m[timeIndex]}°C</p>
                    <p>Rain: ${hourlyForecast.precipitation_probability[timeIndex]}%</p>
                    <p>UV: ${hourlyForecast.uv_index[timeIndex]}</p>
                    <p>Wind: ${hourlyForecast.windspeed_10m[timeIndex]} km/h</p>
                    <p>Humidity: ${hourlyForecast.relativehumidity_2m[timeIndex]}%</p>
                </div>
            `;
        }).join('');

        // Determine the background class based on the weather condition
        let backgroundClass = getBackgroundClass(currentWeather.weathercode);
        document.body.className = backgroundClass;

        // Find the closest hourly time to the current weather time
        let currentTime = new Date(currentWeather.time).getTime();
        let closestTimeIndex = hourlyForecast.time.reduce((prevIndex, currTime, currIndex) => {
            let currDiff = Math.abs(new Date(currTime).getTime() - currentTime);
            let prevDiff = Math.abs(new Date(hourlyForecast.time[prevIndex]).getTime() - currentTime);
            return currDiff < prevDiff ? currIndex : prevIndex;
        }, 0);

        let currentUVIndex = hourlyForecast.uv_index[closestTimeIndex];
        let currentHumidity = hourlyForecast.relativehumidity_2m[closestTimeIndex];
        let currentPressure = hourlyForecast.pressure_msl[closestTimeIndex];

        document.getElementById("weatherDisplay").innerHTML = `
            <div class="current-weather">
                <h2>${locationName}</h2>
                <p>Current Temperature: ${currentWeather.temperature}°C</p>
                <p>Wind Speed: ${currentWeather.windspeed} km/h</p>
                <p>UV Index: ${currentUVIndex}</p>
                <p>Humidity: ${currentHumidity}%</p>
                <p>Pressure: ${currentPressure} hPa</p>
            </div>
            <h3>Hourly Forecast for the Next 4 Hours</h3>
            <div class="hourly-forecast-container">
                ${forecastHTML}
            </div>
        `;
    } catch (error) {
        alert(error.message);
    }
}

function getBackgroundClass(weathercode) {
    switch (weathercode) {
        case 0:
            return "clear-sky";
        case 1: case 2: case 3:
            return "cloudy";
        case 51: case 53: case 55: case 56: case 57:
            return "rainy";
        case 61: case 63: case 65: case 66: case 67:
            return "rainy";
        case 71: case 73: case 75: case 77:
            return "snowy";
        case 80: case 81: case 82:
            return "rainy";
        case 95: case 96: case 99:
            return "stormy";
        default:
            return "clear-sky";
    }
}