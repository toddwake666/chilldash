package com.toddwake.chilldash

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk

class PlayGamesModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val TAG = "PlayGamesModule"
    private val RC_ACHIEVEMENTS = 9002
    private val RC_LEADERBOARDS = 9003

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "PlayGamesModule"

    private fun getCurrentActivityOrNull(): Activity? {
        return reactContext.currentActivity
    }

    private fun formatException(ex: Throwable?): String {
        if (ex == null) return "Unknown error (null exception)"
        if (ex is ApiException) {
            val code = ex.statusCode
            val codeName = try {
                CommonStatusCodes.getStatusCodeString(code)
            } catch (_: Exception) {
                "CODE_$code"
            }
            val hint = when (code) {
                10 -> "DEVELOPER_ERROR (10) - SHA-1 fingerprint / package name mismatch in Google Cloud Console or Play Console credential"
                4 -> "SIGN_IN_REQUIRED (4) - User sign-in required or Play Games profile missing"
                16 -> "CANCELED (16) - Sign-in was canceled or rejected by Play Services"
                7 -> "NETWORK_ERROR (7) - Network connection failed"
                8 -> "INTERNAL_ERROR (8) - Google Play Services internal error"
                15 -> "TIMEOUT (15) - Sign-in request timed out"
                26700 -> "GAME_NOT_FOUND (26700) - Play Games project ID (28991912710) not linked"
                else -> ""
            }
            val base = "[$code: $codeName] ${ex.message ?: ""}".trim()
            return if (hint.isNotEmpty()) "$base ($hint)" else base
        }
        return "${ex.javaClass.simpleName}: ${ex.message}"
    }

    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("isAuthenticated", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val gamesSignInClient = PlayGames.getGamesSignInClient(activity)
            gamesSignInClient.isAuthenticated.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val result = task.result
                    if (result?.isAuthenticated == true) {
                        Log.i(TAG, "Play Games isAuthenticated: true")
                        fetchPlayerInfo(activity, promise)
                    } else {
                        Log.i(TAG, "Play Games isAuthenticated: false")
                        val map = Arguments.createMap().apply {
                            putBoolean("isAuthenticated", false)
                        }
                        promise.resolve(map)
                    }
                } else {
                    val ex = task.exception
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "Play Games isAuthenticated check failed: $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("isAuthenticated", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
            }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in isAuthenticated: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("isAuthenticated", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun signIn(promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("isAuthenticated", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val gamesSignInClient = PlayGames.getGamesSignInClient(activity)
            gamesSignInClient.signIn().addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val result = task.result
                    if (result?.isAuthenticated == true) {
                        Log.i(TAG, "Play Games signIn succeeded and authenticated.")
                        fetchPlayerInfo(activity, promise)
                    } else {
                        val msg = "Play Games: Not authenticated (isAuthenticated=false). Please check: 1) Tester Google account is added in Play Console -> Play Games Services -> Testers. 2) A Play Games gamer profile is created on this device."
                        Log.w(TAG, msg)
                        val map = Arguments.createMap().apply {
                            putBoolean("isAuthenticated", false)
                            putString("error", msg)
                        }
                        promise.resolve(map)
                    }
                } else {
                    val ex = task.exception
                    val errorDetail = formatException(ex)
                    Log.e(TAG, "Play Games signIn failed: $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("isAuthenticated", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
            }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in signIn: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("isAuthenticated", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    private fun fetchPlayerInfo(activity: Activity, promise: Promise) {
        try {
            val playersClient = PlayGames.getPlayersClient(activity)
            playersClient.currentPlayer.addOnSuccessListener { player ->
                Log.i(TAG, "fetchPlayerInfo success: ${player.displayName} (${player.playerId})")
                val map = Arguments.createMap().apply {
                    putBoolean("isAuthenticated", true)
                    putString("playerId", player.playerId)
                    putString("displayName", player.displayName)
                    putString("title", player.title)
                    putString("iconUri", player.iconImageUri?.toString() ?: "")
                }
                promise.resolve(map)
            }.addOnFailureListener { ex ->
                val errorDetail = formatException(ex)
                Log.w(TAG, "fetchPlayerInfo failed, returning basic auth: $errorDetail", ex)
                val map = Arguments.createMap().apply {
                    putBoolean("isAuthenticated", true)
                    putString("error", "Signed in, but profile load failed: $errorDetail")
                }
                promise.resolve(map)
            }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in fetchPlayerInfo: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("isAuthenticated", true)
                putString("error", "Signed in, but profile exception: $errorDetail")
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun unlockAchievement(achievementId: String, promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val achievementsClient = PlayGames.getAchievementsClient(activity)
            achievementsClient.unlockImmediate(achievementId)
                .addOnSuccessListener {
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { ex ->
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "unlockAchievement failed ($achievementId): $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in unlockAchievement: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun incrementAchievement(achievementId: String, steps: Int, promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val achievementsClient = PlayGames.getAchievementsClient(activity)
            achievementsClient.incrementImmediate(achievementId, steps)
                .addOnSuccessListener {
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { ex ->
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "incrementAchievement failed ($achievementId): $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in incrementAchievement: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun showAchievements(promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val achievementsClient = PlayGames.getAchievementsClient(activity)
            achievementsClient.achievementsIntent
                .addOnSuccessListener { intent ->
                    activity.startActivityForResult(intent, RC_ACHIEVEMENTS)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { ex ->
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "showAchievements failed: $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in showAchievements: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun submitScore(leaderboardId: String, score: Double, promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val leaderboardsClient = PlayGames.getLeaderboardsClient(activity)
            leaderboardsClient.submitScoreImmediate(leaderboardId, score.toLong())
                .addOnSuccessListener {
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { ex ->
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "submitScore failed ($leaderboardId): $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in submitScore: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun showLeaderboard(leaderboardId: String?, promise: Promise) {
        val activity = getCurrentActivityOrNull()
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", "Activity unavailable")
            }
            promise.resolve(map)
            return
        }

        try {
            val leaderboardsClient = PlayGames.getLeaderboardsClient(activity)
            val intentTask = if (!leaderboardId.isNullOrEmpty()) {
                leaderboardsClient.getLeaderboardIntent(leaderboardId)
            } else {
                leaderboardsClient.allLeaderboardsIntent
            }

            intentTask
                .addOnSuccessListener { intent ->
                    activity.startActivityForResult(intent, RC_LEADERBOARDS)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { ex ->
                    val errorDetail = formatException(ex)
                    Log.w(TAG, "showLeaderboard failed: $errorDetail", ex)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", errorDetail)
                    }
                    promise.resolve(map)
                }
        } catch (e: Exception) {
            val errorDetail = formatException(e)
            Log.e(TAG, "Exception in showLeaderboard: $errorDetail", e)
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorDetail)
            }
            promise.resolve(map)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        // Overlay results handled by Google Play Games
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }

    override fun invalidate() {
        super.invalidate()
        try {
            reactContext.removeActivityEventListener(this)
        } catch (e: Exception) {
            // ignore
        }
    }
}
