import { Filesystem, Directory, ReadFileOptions, WriteFileOptions, FileInfo } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Service for interacting with the device file system
 * Uses Capacitor Filesystem plugin for native operations
 */
export class FileSystemService {
  private static instance: FileSystemService;
  private isNative = false;

  private constructor() {
    // Initialize
  }

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  public async initialize(): Promise<void> {
    const info = await Device.getInfo();
    this.isNative = info.platform === 'android' || info.platform === 'ios';

    // Create app directories if needed
    if (this.isNative) {
      try {
        // Create main videos directory
        await this.createDirectory('videos');
        
        // Create thumbs directory
        await this.createDirectory('thumbs');
        
        // Create temp directory
        await this.createDirectory('temp');
        
        console.log('FileSystem initialized successfully');
      } catch (error) {
        console.error('Error initializing filesystem:', error);
      }
    }
  }

  /**
   * Create a directory if it doesn't exist
   */
  async createDirectory(dirName: string): Promise<void> {
    try {
      // Check if directory exists first
      const checkResult = await Filesystem.stat({
        path: dirName,
        directory: Directory.Documents
      }).catch(() => null);

      // If directory doesn't exist, create it
      if (!checkResult) {
        await Filesystem.mkdir({
          path: dirName,
          directory: Directory.Documents,
          recursive: true
        });
      }
    } catch (error) {
      console.error(`Error creating directory ${dirName}:`, error);
      throw error;
    }
  }

  /**
   * Write data to a file
   */
  async writeFile(path: string, data: string | Uint8Array, options?: Partial<WriteFileOptions>): Promise<string> {
    try {
      // Ensure directory exists
      const dirPath = path.split('/').slice(0, -1).join('/');
      if (dirPath) {
        await this.createDirectory(dirPath);
      }
      
      const result = await Filesystem.writeFile({
        path,
        data: data instanceof Uint8Array ? this.arrayBufferToBase64(data) : data,
        directory: Directory.Documents,
        recursive: true,
        ...options
      });
      
      return result.uri;
    } catch (error) {
      console.error(`Error writing file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Read a file
   */
  async readFile(path: string, options?: Partial<ReadFileOptions>): Promise<string> {
    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Documents,
        ...options
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error reading file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path,
        directory: Directory.Documents
      });
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Copy a file from source to destination
   */
  async copyFile(source: string, destination: string): Promise<string> {
    try {
      // Read the source file
      const fileData = await this.readFile(source);
      
      // Write to destination
      return this.writeFile(destination, fileData);
    } catch (error) {
      console.error(`Error copying file from ${source} to ${destination}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await Filesystem.stat({
        path,
        directory: Directory.Documents
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(directory: string): Promise<FileInfo[]> {
    try {
      const result = await Filesystem.readdir({
        path: directory,
        directory: Directory.Documents
      });
      
      return result.files;
    } catch (error) {
      console.error(`Error listing files in ${directory}:`, error);
      throw error;
    }
  }

  /**
   * Open a file with the default app
   */
  async openFile(path: string, mimeType: string): Promise<void> {
    try {
      // Get the full URI for the file
      const fileInfo = await Filesystem.getUri({
        path,
        directory: Directory.Documents
      });
      
      // Open the file with the default app
      await FileOpener.open({
        filePath: fileInfo.uri,
        contentType: mimeType
      });
    } catch (error) {
      console.error(`Error opening file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Convert a file path to a URI that can be used in img src attributes
   */
  async getFileUri(path: string): Promise<string> {
    try {
      const fileInfo = await Filesystem.getUri({
        path,
        directory: Directory.Documents
      });
      
      return fileInfo.uri;
    } catch (error) {
      console.error(`Error getting URI for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to convert array buffer to base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }
}

export const filesystemService = FileSystemService.getInstance();