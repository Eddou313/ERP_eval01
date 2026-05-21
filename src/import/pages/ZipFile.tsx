import { type ChangeEvent, useState, useRef } from 'react';
import JSZip from 'jszip'; // Importation de JSZip
// import './zip.css';

type ZipFileProps = {
  onZipSelected?: (file: File | null) => void;
};

export function ZipFile({ onZipSelected }: ZipFileProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]); // Pour stocker les noms des fichiers
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // --- FONCTION 1 : Extraire et lire le contenu ---
  const extractZipContents = async (file: File) => {
    const jszip = new JSZip();
    try {
      // On charge le fichier ZIP
      const contents = await jszip.loadAsync(file);
      
      // On extrait les noms des fichiers contenus à l'intérieur
      const names = Object.keys(contents.files);
      setFileList(names);
    } catch (err) {
      setError("Erreur lors de la lecture du fichier ZIP.");
      console.error(err);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isZip = file.type === "application/zip" || 
                  file.type === "application/x-zip-compressed" ||
                  file.name.toLowerCase().endsWith('.zip');

    if (!isZip) {
      setError("Erreur : Seuls les fichiers .zip sont acceptés.");
      setSelectedFile(null);
      setFileList([]);
      onZipSelected?.(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
    onZipSelected?.(file);
    
    // Appel de la fonction d'extraction dès que le fichier est sélectionné
    await extractZipContents(file);
  };

  // --- FONCTION 2 : Affichage des contenus (Rendu conditionnel) ---
  const renderFileList = () => {
    if (fileList.length === 0) return null;

    return (
      <div className="file-preview-list">
        <h4>Contenu de l'archive :</h4>
        <ul>
          {fileList.map((fileName, index) => (
            <li key={index} className="file-item">
              📄 {fileName}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="zip-container">
      <label htmlFor="zip-upload" className="zip-label">
        📦 Importer une archive
      </label>
      
      <input
        ref={inputRef}
        id="zip-upload"
        type="file"
        className="zip-input"
        accept=".zip"
        onChange={handleFileChange}
      />

      {error && <p className="msg-error">{error}</p>}
      
      {selectedFile && !error && (
        <div className="msg-success">
          <strong>Fichier chargé :</strong> {selectedFile.name}
        </div>
      )}

      {/* Affichage de la liste des fichiers */}
      {renderFileList()}
    </div>
  );
}

export default ZipFile;