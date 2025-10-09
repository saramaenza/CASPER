const domainMap = {
    "light": "bx-light-bulb",
    "binary_sensor": "bx-toggle-left", // o bx-toggle-right a seconda dello stato
    "sensor": "bx-tachometer",
    "switch": "bx-plug-connect", // o bx-toggle-off
    "fan": "bx-air-conditioner",
    "cover": "bx-window-open", // o bx-window-close
    "climate": "bxs-thermometer",
    "automation": "bx-bot",
    "button": "bx-checkbox-checked",
    "calendar": "bx-calendar",
    "camera": "bx-camera",
    "device_tracker": "bx-devices",
    "group": "bx-collection",
    "input_boolean": "bx-toggle-on", // o bx-toggle-off
    "input_button": "bx-checkbox-checked",
    "input_datetime": "bx-calendar-edit",
    "input_number": "bx-trip",
    "input_select": "bx-chevron-down-square",
    "input_text": "bx-text",
    "lock": "bx-lock-alt", // o bx-lock-open-alt
    "media_player": "bx-play-circle",
    "person": "bx-user",
    "remote": "bx-cast",
    "scene": "bx-image",
    "script": "bx-file-blank", // o bx-code-alt
    "select": "bx-chevron-down-square",
    "siren": "bx-bell",
    "sun": "bx-sun", // o bx-moon per la notte
    "timer": "bx-timer",
    "update": "bx-chevrons-down",
    "event": "bx-calendar-event",
    "vacuum": "bx-loader-circle", // Potrebbe essere necessaria un'icona più specifica
    "weather": "bx-cloud", // Varia molto in base allo stato (bx-sun, bx-cloud-rain, etc.)
    "zone": "bx-map-pin",
    "alert": "bx-error-alt",
    "counter": "bx-calculator",
    "image_processing": "bx-image-alt",
    "notify": "bx-bell",
    "number": "bx-trip",
    "persistent_notification": "bx-bell-plus",
    "plant": "bx-leaf",
    "proximity": "bx-target-lock",
    "schedule": "bx-calendar-week",
    "stt": "bx-microphone",
    "tts": "bx-volume-full",
    "utility_meter": "bx-tachometer",
    "wake_word": "bx-microphone" // Approssimazione
};

const classMap = {
    // Binary Sensor device classes
    "battery": "bx-battery",
    "battery_charging": "bxs-battery-charging",
    "carbon_monoxide": "bx-cloud-light-rain", // Approssimazione, non c'è un'icona specifica per CO
    "cold": "bx-snowflake", // Generica per freddo, potrebbe essere bx-snowflake
    "connectivity": "bx-wifi",
    "door": "bx-door-open",
    "garage_door": "bxs-car-garage",
    "gas": "bxs-flame", // Generica per gas
    "heat": "bxs-hot", // Generica per calore
    "light": "bx-sun", // Per sensore di luce ambientale
    "lock": "bx-lock-open-alt", // Stato sbloccato per un sensore
    "moisture": "bx-water",
    "motion": "bx-running",
    "moving": "bx-move",
    "occupancy": "bx-user-check",
    "opening": "bx-expand-arrows-alt",
    "plug": "bx-plug-connect",
    "power": "bx-power-off", // Inteso come presenza di alimentazione
    "presence": "bx-street-view",
    "problem": "bx-alert-triangle",
    "running": "bx-play-circle", // Per processi o dispositivi in esecuzione
    "safety": "bx-shield-quarter",
    "smoke": "bx-bonfire", // Approssimazione
    "sound": "bx-volume-full",
    "tamper": "bx-shield-x",
    "update": "bx-chevrons-down",
    "event": "bx-calendar-event",
    "vibration": "bx-broadcast",
    "window": "bx-cupboard", // Per sensori di apertura finestre

    // Sensor device classes
    "apparent_power": "bx-bolt-circle",
    "aqi": "bx-air", // Air Quality Index
    "atmospheric_pressure": "bx-tachometer", // Generica, non c'è un'icona specifica per pressione
    "carbon_dioxide": "bx-cloud", // CO2
    "current": "bx-flash", // Corrente elettrica
    "data_rate": "bx-wifi",
    "data_size": "bx-data",
    "date": "bx-calendar-event",
    "distance": "bx-ruler",
    "duration": "bx-timer",
    "energy": "bx-bolt", // Energia elettrica
    "frequency": "bx-pulse",
    "gas": "bx-smoke-alarm", // Per misuratori di gas
    "humidity": "bx-water-drop",
    "illuminance": "bx-sun",
    "irradiance": "bx-sun", // Simile a illuminance
    "moisture": "bx-water", // Per sensori di umidità del suolo, etc.
    "monetary": "bx-dollar-circle", // Per valori monetari
    "nitrogen_dioxide": "bx-cloud",
    "nitrogen_monoxide": "bx-cloud",
    "nitrous_oxide": "bx-cloud",
    "ozone": "bx-cloud",
    "pm1": "bx-wind", // Particolato
    "pm10": "bx-wind",
    "pm25": "bx-wind",
    "power_factor": "bx-slider-alt",
    "power": "bx-plug-connect", // Potenza elettrica
    "precipitation": "bx-cloud-drizzle",
    "precipitation_intensity": "bx-cloud-rain",
    "pressure": "bx-tachometer", // Pressione generica
    "reactive_power": "bx-bolt-circle",
    "signal_strength": "bx-signal-5",
    "sound_pressure": "bx-volume-low",
    "speed": "bx-tachometer", // Velocità del vento, etc.
    "sulphur_dioxide": "bx-cloud",
    "temperature": "bxs-thermometer",
    "timestamp": "bx-clock-4",
    "volatile_organic_compounds": "bx-wind", // VOCs
    "voltage": "bx-line-chart-down", // Tensione
    "volume": "bxs-drink", // Volume di liquidi
    "water": "bx-water", // Consumo acqua
    "weight": "bx-dumbbell", // Peso
    "wind_speed": "bx-wind",

    // Cover device classes
    "awning": "bx-store-alt",
    "blind": "bx-slider", // Generica per tapparelle/veneziane
    "curtain": "bxs-vector", // Approssimazione per tende
    "damper": "bx-toggle-left", // Per serrande di ventilazione
    "garage": "bxs-car-garage", // Per porte garage
    "gate": "bx-arch", // Per cancelli
    "shade": "bx-checkbox-minus", // Generica per ombreggianti
    "shutter": "bx-windows", // Per persiane/scuri
    "window": "bx-cupboard", // Per finestre motorizzate

    // Switch device classes (alcune si sovrappongono a binary_sensor, ma qui per controllo)
    // "outlet" -> usa "plug" da binary_sensor
    // "switch" -> usa l'icona generica di switch da iconsMap

    // Aggiungi altre device_class se necessario
    "default": "bx-chip" // Icona generica di default per device_class non mappate
};