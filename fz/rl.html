rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    match /users/{userId} {
      allow read, write: if isAdmin();
    }
    function isAdmin() {
      return request.auth != null &&
        request.auth.uid in [
          'sKUOlWO21Sak8J',
          'DbTXaljWI6Nl4l',
          'jkDsEz2LyRcoFf'
        ];
    }
  }
}
