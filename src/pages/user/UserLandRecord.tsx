// pages/AdminLands.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';


import {
  fetchLandStatus,
  createLandStatus,
  updateLandStatus,
  deleteLandStatus,
  setFilters,
  resetFilters,
  clearSelectedRecord,
  clearError,
  fetchLandStatusById,
  selectAllLandStatus,
  selectLandStatusPagination,
  selectLandStatusFilters,
  selectLandStatusListLoading,
  selectLandStatusMutating,
  selectLandStatusError,
  selectSelectedLandRecord,
  selectLandStatusSummary,
  formatAcreage,
  getStatusBadgeClass,
  type LandStatus,
  type CreateLandStatusDto,
} from '../../store/slices/landSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import FilePreviewModal from '../admin/Lands/PreviewModal';

// Fix Leaflet default marker icons broken by bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ============================================================
   CONSTANTS
============================================================ */

const EMPTY_FORM: CreateLandStatusDto = {
  county: '',
  file_ref: '',
  property: '',
  title_percil_number: '',
  acreage: '',
  location: '',
  status: '',
  current_intended_use: '',
  ownership_status: '',
  possessions: '',
  fencing: '',
  disputes: '',
  recommendation: '',
  latitude: undefined,
  longitude: undefined,
};

const KENYA_CENTER: [number, number] = [-0.0236, 37.9062];

/* ============================================================
   HELPERS
============================================================ */

const fmt = (val: string | null | undefined) =>
  val ? (
    <span className="truncate block max-w-[200px]" title={val}>
      {val}
    </span>
  ) : (
    <span className="text-slate-300">—</span>
  );

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/* ============================================================
   SPINNER
============================================================ */

const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

/* ============================================================
   MAP CLICK HANDLER
============================================================ */

interface MapClickHandlerProps {
  onPick: (lat: number, lng: number) => void;
}

const MapClickHandler = ({ onPick }: MapClickHandlerProps) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/* ============================================================
   MAP FLY-TO
============================================================ */

const MapFlyTo = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
};

/* ============================================================
   MAP PICKER SECTION
============================================================ */

interface MapPickerProps {
  lat: number | undefined;
  lng: number | undefined;
  onPick: (lat: number, lng: number) => void;
  onClear: () => void;
  onLatChange: (val: string) => void;
  onLngChange: (val: string) => void;
}

const MapPicker = ({ lat, lng, onPick, onClear, onLatChange, onLngChange }: MapPickerProps) => {
  const hasPin = lat !== undefined && lng !== undefined;

  return (
    <div className="col-span-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          Geolocation (optional)
        </label>
        {hasPin && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 transition"
          >
            Clear pin
          </button>
        )}
      </div>

      {/* Manual inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Latitude</label>
          <input
            type="number"
            step="any"
            value={lat ?? ''}
            onChange={(e) => onLatChange(e.target.value)}
            placeholder="e.g. -1.2921"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Longitude</label>
          <input
            type="number"
            step="any"
            value={lng ?? ''}
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="e.g. 36.8219"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Click anywhere on the map to drop a pin, or type coordinates above.
      </p>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: 260 }}>
        <MapContainer
          center={hasPin ? [lat!, lng!] : KENYA_CENTER}
          zoom={hasPin ? 15 : 6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={onPick} />
          {hasPin && (
            <>
              <Marker position={[lat!, lng!]} />
              <MapFlyTo center={[lat!, lng!]} />
            </>
          )}
        </MapContainer>
      </div>

      {hasPin && (
        <p className="text-xs text-emerald-600 font-medium">
          📍 Pin set at {lat!.toFixed(6)}, {lng!.toFixed(6)}
        </p>
      )}
    </div>
  );
};

/* ============================================================
   DELETE MODAL
============================================================ */

interface DeleteModalProps {
  record: LandStatus;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal = ({ record, onConfirm, onCancel, loading }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Delete land record</h3>
          <p className="mt-1 text-sm text-slate-500">
            This will permanently remove the land record for{' '}
            <span className="font-medium text-slate-700">
              {record.property || record.file_ref || 'this item'}
            </span>
            . This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
        >
          {loading && <Spinner />}
          Delete record
        </button>
      </div>
    </div>
  </div>
);

/* ============================================================
   LAND MODAL (ADD/EDIT)
============================================================ */

interface LandModalProps {
  initial: LandStatus | null;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  loading: boolean;
}

const LandModal = ({ initial, onSubmit, onClose, loading }: LandModalProps) => {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateLandStatusDto>(() =>
    initial
      ? {
          county: initial.county,
          file_ref: initial.file_ref ?? '',
          property: initial.property ?? '',
          title_percil_number: initial.title_percil_number ?? '',
          acreage: initial.acreage ?? '',
          location: initial.location ?? '',
          status: initial.status ?? '',
          current_intended_use: initial.current_intended_use ?? '',
          ownership_status: initial.ownership_status ?? '',
          possessions: initial.possessions ?? '',
          fencing: initial.fencing ?? '',
          disputes: initial.disputes ?? '',
          recommendation: initial.recommendation ?? '',
          latitude: initial.latitude ?? undefined,
          longitude: initial.longitude ?? undefined,
        }
      : { ...EMPTY_FORM }
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateLandStatusDto, string>>>({});

  const setField = <K extends keyof CreateLandStatusDto>(key: K, val: CreateLandStatusDto[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.county.trim()) errs.county = 'County is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    selectedFiles.forEach((file) => formData.append('documents', file));
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit Land Record' : 'Add New Land Record'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit
                ? `Editing ${initial?.property || initial?.file_ref}`
                : 'Fill in the land details and upload supporting documents'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            {/* County */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">County *</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.county}
                onChange={(e) => setField('county', e.target.value)}
                placeholder="e.g., MOMBASA, NAIROBI"
                required
              />
              {errors.county && <span className="text-xs text-red-500">{errors.county}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">File Ref</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.file_ref}
                onChange={(e) => setField('file_ref', e.target.value)}
                placeholder="e.g., 1A2, 2A1"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Property</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.property}
                onChange={(e) => setField('property', e.target.value)}
                placeholder="Property name"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Title/Percil Number</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title_percil_number}
                onChange={(e) => setField('title_percil_number', e.target.value)}
                placeholder="e.g., M5A/BLOCK XXVII/700"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Acreage</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.acreage}
                onChange={(e) => setField('acreage', e.target.value)}
                placeholder="e.g., 0.585 acres"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Location</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="Location description"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Status</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                placeholder="e.g., UPROJECTED LAND"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Current/Intended Use
              </label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.current_intended_use}
                onChange={(e) => setField('current_intended_use', e.target.value)}
                placeholder="Current or intended use"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ownership Status</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.ownership_status}
                onChange={(e) => setField('ownership_status', e.target.value)}
                placeholder="Ownership details"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Possessions</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.possessions}
                onChange={(e) => setField('possessions', e.target.value)}
                placeholder="Possession details"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Fencing</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.fencing}
                onChange={(e) => setField('fencing', e.target.value)}
                placeholder="Fencing status"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Disputes</label>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.disputes}
                onChange={(e) => setField('disputes', e.target.value)}
                placeholder="Any disputes"
              />
            </div>

            <div className="col-span-full">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Recommendation</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.recommendation}
                onChange={(e) => setField('recommendation', e.target.value)}
                placeholder="Recommendations..."
              />
            </div>

            {/* Map Picker */}
            <MapPicker
              lat={form.latitude}
              lng={form.longitude}
              onPick={(lat, lng) => {
                setField('latitude', lat);
                setField('longitude', lng);
              }}
              onClear={() => {
                setField('latitude', undefined);
                setField('longitude', undefined);
              }}
              onLatChange={(val) => setField('latitude', val === '' ? undefined : parseFloat(val))}
              onLngChange={(val) => setField('longitude', val === '' ? undefined : parseFloat(val))}
            />

            {/* File Upload */}
            <div className="col-span-full">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Upload Documents (Images, PDFs, Docs, etc.)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-400 mt-1">
                Supported: images, PDFs, Office docs, text, ZIP. Max 50 files, 55MB each.
              </p>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-md text-sm"
                    >
                      <span className="truncate text-slate-700">{file.name}</span>
                      <span className="text-slate-400 text-xs">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {isEdit ? 'Save changes' : 'Add record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   LOCATION VIEW MODAL
============================================================ */

interface LocationViewModalProps {
  record: LandStatus;
  onClose: () => void;
}

const LocationViewModal = ({ record, onClose }: LocationViewModalProps) => {
  const center: [number, number] = [record.latitude!, record.longitude!];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Land Location</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.property || record.file_ref || record.county} · {record.latitude!.toFixed(6)},{' '}
              {record.longitude!.toFixed(6)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ height: 420 }}>
          <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center} />
          </MapContainer>
        </div>
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t text-xs text-slate-500">
          <span>&#128205; {record.location || record.county}</span>
          <a
            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            Open in Google Maps &#8599;
          </a>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DETAIL VIEW MODAL
============================================================ */

interface DetailViewModalProps {
  record: LandStatus;
  onClose: () => void;
  onPreviewFile: (url: string, filename: string) => void;
}

const DetailViewModal = ({ record, onClose, onPreviewFile }: DetailViewModalProps) => {
  const [showMap, setShowMap] = useState(false);
  const hasLocation = record.latitude != null && record.longitude != null;

  const displayText = (val: string | null | undefined) =>
    val ? <span className="break-words">{val}</span> : <span className="text-slate-300">—</span>;

  return (
    <>
      {showMap && hasLocation && (
        <LocationViewModal record={record} onClose={() => setShowMap(false)} />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl">
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-slate-900">Land Record Details</h2>
            <div className="flex items-center gap-2">
              {hasLocation && (
                <button
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  View Location
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">County</dt>
                <dd className="text-sm text-slate-900 font-medium">{record.county}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">File Ref</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.file_ref)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Property</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.property)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title/Percil Number</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.title_percil_number)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Acreage</dt>
                <dd className="text-sm text-slate-700 break-words">{formatAcreage(record.acreage)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</dt>
                <dd>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                      record.status
                    )}`}
                  >
                    {record.status || '—'}
                  </span>
                </dd>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Location</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.location)}</dd>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Current/Intended Use
                </dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.current_intended_use)}</dd>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ownership Status</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.ownership_status)}</dd>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Possessions</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.possessions)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fencing</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.fencing)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Disputes</dt>
                <dd className="text-sm text-slate-700 break-words">{displayText(record.disputes)}</dd>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recommendation</dt>
                <dd className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {record.recommendation || <span className="text-slate-300">—</span>}
                </dd>
              </div>

              {hasLocation && (
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Geolocation</dt>
                  <dd className="text-sm text-slate-700 flex items-center gap-2">
                    <span>
                      {record.latitude!.toFixed(6)}, {record.longitude!.toFixed(6)}
                    </span>
                    <button
                      onClick={() => setShowMap(true)}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      View on map →
                    </button>
                  </dd>
                </div>
              )}

              {record.documents && record.documents.length > 0 && (
                <div className="col-span-1 md:col-span-2 space-y-2 mt-2 border-t pt-3">
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Attached Documents ({record.documents.length})
                  </dt>
                  <dd className="space-y-1">
                    {record.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-md"
                      >
                        <button
                          onClick={() => onPreviewFile(doc.url, doc.filename)}
                          className="text-blue-600 hover:underline truncate max-w-[70%] text-left"
                        >
                          {doc.filename}
                        </button>
                        <span className="text-xs text-slate-400">{formatFileSize(doc.size)}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end px-6 py-4 border-t bg-slate-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ============================================================
   PAGINATION
============================================================ */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) {
        start = 2;
        end = maxVisible - 1;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - (maxVisible - 2);
        end = totalPages - 1;
      }
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 select-none">
            ...
          </span>
        ) : (
          <button
            key={`page-${page}`}
            onClick={() => onPageChange(page as number)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition ${
              page === currentPage ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

/* ============================================================
   MAIN PAGE
============================================================ */

const UserLandRecord = () => {
  const dispatch = useAppDispatch();

  const records = useAppSelector(selectAllLandStatus);
  const pagination = useAppSelector(selectLandStatusPagination);
  const filters = useAppSelector(selectLandStatusFilters);
  const summary = useAppSelector(selectLandStatusSummary);
  const listLoading = useAppSelector(selectLandStatusListLoading);
  const mutating = useAppSelector(selectLandStatusMutating);
  const error = useAppSelector(selectLandStatusError);
  const selectedRecord = useAppSelector(selectSelectedLandRecord);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LandStatus | null>(null);
  const [editingRecord, setEditingRecord] = useState<LandStatus | null>(null);
  const [viewingRecord, setViewingRecord] = useState<LandStatus | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [countyFilter, setCountyFilter] = useState(filters.county ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string } | null>(null);

  const { page, search, county, status, limit } = filters;

  useEffect(() => {
    dispatch(fetchLandStatus(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, search, county, status, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) dispatch(setFilters({ search: searchInput || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (countyFilter !== filters.county) dispatch(setFilters({ county: countyFilter || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [countyFilter, dispatch, filters.county]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (statusFilter !== filters.status) dispatch(setFilters({ status: statusFilter || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [statusFilter, dispatch, filters.status]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setFilters({ page }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [dispatch]
  );

  const openAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };
  const openEdit = (record: LandStatus) => {
    dispatch(fetchLandStatusById(record.id));
    setEditingRecord(record);
    setModalOpen(true);
  };
  const openView = (record: LandStatus) => setViewingRecord(record);
  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    dispatch(clearSelectedRecord());
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      if (editingRecord) {
        await dispatch(updateLandStatus({ id: editingRecord.id, formData })).unwrap();
        toast.success('Land record updated successfully');
      } else {
        await dispatch(createLandStatus(formData)).unwrap();
        toast.success('Land record created successfully');
      }
      closeModal();
    } catch (err) {
      toast.error(err as string || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteLandStatus(deleteTarget.id)).unwrap();
      toast.success('Land record deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err as string || 'Deletion failed');
    }
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setSearchInput('');
    setCountyFilter('');
    setStatusFilter('');
  };

  const openFilePreview = (url: string, filename: string) => setPreviewFile({ url, filename });
  const closeFilePreview = () => setPreviewFile(null);

  const handlePaperclipClick = async (record: LandStatus) => {
    if (record.documents && record.documents.length > 0) {
      openFilePreview(record.documents[0].url, record.documents[0].filename);
      return;
    }
    try {
      const fetched = await dispatch(fetchLandStatusById(record.id)).unwrap();
      if (fetched.documents && fetched.documents.length > 0) {
        openFilePreview(fetched.documents[0].url, fetched.documents[0].filename);
      } else {
        toast.error('No documents found for this record');
      }
    } catch {
      toast.error('Failed to fetch documents');
    }
  };

  const headers = [
    'County',
    'File Ref',
    'Property',
    'Title/Percil No.',
    'Acreage',
    'Location',
    'Status',
    'Current/Intended Use',
    'Ownership Status',
    'Possessions',
    'Fencing',
    'Disputes',
    'Recommendation',
    'Docs',
    'Location',
    'Actions',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {previewFile && (
        <FilePreviewModal url={previewFile.url} fileName={previewFile.filename} onClose={closeFilePreview} />
      )}
      {modalOpen && (
        <LandModal
          initial={editingRecord ? (selectedRecord ?? editingRecord) : null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
      {viewingRecord && (
        <DetailViewModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onPreviewFile={openFilePreview}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Land Status</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} record{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Record
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Properties</p>
              <p className="text-2xl font-bold text-slate-900">{summary.total_properties}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Counties</p>
              <p className="text-2xl font-bold text-slate-900">{summary.counties}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by property, location..."
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
              placeholder="County"
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Status"
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1500px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center">
                      <div className="flex justify-center">
                        <Spinner size="md" />
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No land records found
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                      onClick={() => openView(record)}
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">{record.county}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-xs">{fmt(record.file_ref)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={record.property ?? ''}>
                        {fmt(record.property)}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-600 max-w-[150px] truncate"
                        title={record.title_percil_number ?? ''}
                      >
                        {fmt(record.title_percil_number)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {formatAcreage(record.acreage)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={record.location ?? ''}>
                        {fmt(record.location)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(record.status)}`}>
                          {record.status || '—'}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-slate-600 max-w-[200px] truncate"
                        title={record.current_intended_use ?? ''}
                      >
                        {fmt(record.current_intended_use)}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-600 max-w-[200px] truncate"
                        title={record.ownership_status ?? ''}
                      >
                        {fmt(record.ownership_status)}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-600 max-w-[150px] truncate"
                        title={record.possessions ?? ''}
                      >
                        {fmt(record.possessions)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={record.fencing ?? ''}>
                        {fmt(record.fencing)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={record.disputes ?? ''}>
                        {fmt(record.disputes)}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-600 max-w-[250px] truncate"
                        title={record.recommendation ?? ''}
                      >
                        {fmt(record.recommendation)}
                      </td>

                      {/* Docs */}
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {record.documents_count && record.documents_count > 0 ? (
                          <svg
                            className="w-5 h-5 text-blue-500 mx-auto cursor-pointer hover:text-blue-700 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            onClick={() => handlePaperclipClick(record)}
                          >
                            <title>Preview document</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Location pin in table */}
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {record.latitude != null && record.longitude != null ? (
                          <button
                            onClick={() => setViewingRecord(record)}
                            title="View location"
                            className="mx-auto flex items-center justify-center"
                          >
                            <svg
                              className="w-5 h-5 text-emerald-500 hover:text-emerald-700 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openView(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                         
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!listLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total.toLocaleString()}
              </span>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLandRecord;