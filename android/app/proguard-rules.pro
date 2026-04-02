# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep Room entities
-keep class in.devlune.voltex.data.local.entity.** { *; }

# Keep domain models for Gson serialization
-keep class in.devlune.voltex.domain.model.** { *; }

# Markwon
-dontwarn org.commonmark.**
