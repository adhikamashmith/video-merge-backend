declare global {
  namespace Express {
    interface Request {
      tempUploadPaths?: string[];
    }
  }
}

export {};
