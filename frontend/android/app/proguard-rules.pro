# Project specific ProGuard / R8 rules for Chill Dash

# React Native & Hermes
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.common.internal.DoNotStrip *;
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule {
    public <methods>;
}
-keep class * extends com.facebook.react.bridge.NativeModule { *; }

# Chill Dash native package and custom modules (PlayGames, PlayUpdates)
-keep class com.toddwake.chilldash.** { *; }
-keepclassmembers class com.toddwake.chilldash.** { *; }

# Google Play Games Services v2
-keep class com.google.android.gms.games.** { *; }
-keep interface com.google.android.gms.games.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.android.gms.games.**

# Google Play In-App Updates
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# Expo Modules architecture
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-keep class * extends expo.modules.kotlin.modules.Module { *; }

# Reanimated & Gesture Handler & Screens
-keep class com.swmansion.reanimated.** { *; }
-keepclassmembers class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }
-keepclassmembers class com.horcrux.svg.** { *; }

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# RevenueCat Purchases
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# PostHog Analytics
-keep class com.posthog.** { *; }
-dontwarn com.posthog.**

# General library dontwarns for clean R8 full-mode builds
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
-dontwarn kotlin.**
