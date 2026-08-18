"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon paths
const iconUser = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconSchool = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  userLocation: { lat: number; lng: number } | null;
  schoolLocation: { lat: number; lng: number } | null;
  schoolName?: string;
}

// Utility to auto-adjust map bounds
function ChangeView({ userLocation, schoolLocation }: MapComponentProps) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && schoolLocation) {
      const bounds = L.latLngBounds([userLocation, schoolLocation]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (userLocation) {
      map.setView(userLocation, 15);
    } else if (schoolLocation) {
      map.setView(schoolLocation, 15);
    }
  }, [map, userLocation, schoolLocation]);

  return null;
}

// Calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function MapComponent({ userLocation, schoolLocation, schoolName }: MapComponentProps) {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (userLocation && schoolLocation) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, schoolLocation.lat, schoolLocation.lng);
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [userLocation, schoolLocation]);

  // Default center if no locations exist (Vadodara center)
  const defaultCenter = { lat: 22.3072, lng: 73.1812 };
  const center = userLocation || schoolLocation || defaultCenter;

  const estimatedTimeMins = distance ? Math.ceil((distance / 30) * 60) : null; // assuming 30 km/h city speed

  return (
    <div className="flex flex-col gap-4">
      {/* Distance Card */}
      {distance !== null && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Distance to School</p>
            <p className="text-xl font-bold text-slate-900">{distance.toFixed(1)} km</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-medium">Est. Travel Time</p>
            <p className="text-lg font-semibold text-brand-600">~{estimatedTimeMins} mins</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border-2 border-slate-200 relative z-0">
        <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {userLocation && (
            <Marker position={userLocation} icon={iconUser}>
              <Popup>
                <div className="font-semibold">You are here</div>
              </Popup>
            </Marker>
          )}

          {schoolLocation && (
            <Marker position={schoolLocation} icon={iconSchool}>
              <Popup>
                <div className="font-semibold text-emerald-700">{schoolName || "Selected School"}</div>
              </Popup>
            </Marker>
          )}

          {userLocation && schoolLocation && (
            <Polyline positions={[userLocation, schoolLocation]} color="#3b82f6" weight={3} dashArray="5, 10" />
          )}

          <ChangeView userLocation={userLocation} schoolLocation={schoolLocation} />
        </MapContainer>
      </div>
    </div>
  );
}
