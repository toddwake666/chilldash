package com.toddwake.chilldash

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

class PlayUpdateModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val appUpdateManager: AppUpdateManager = AppUpdateManagerFactory.create(reactContext)
    private var cachedUpdateInfo: AppUpdateInfo? = null
    private val UPDATE_REQUEST_CODE = 51234
    private var pendingPromise: Promise? = null

    private val installStateListener = InstallStateUpdatedListener { state ->
        val status = state.installStatus()
        if (status == InstallStatus.DOWNLOADED) {
            sendEvent("onPlayUpdateDownloaded", null)
        }
    }

    init {
        reactContext.addActivityEventListener(this)
        appUpdateManager.registerListener(installStateListener)
    }

    override fun getName(): String = "PlayUpdateModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun checkForUpdate(promise: Promise) {
        try {
            appUpdateManager.appUpdateInfo
                .addOnSuccessListener { info ->
                    cachedUpdateInfo = info
                    val availability = info.updateAvailability()
                    val isAvailable = availability == UpdateAvailability.UPDATE_AVAILABLE
                    val map = Arguments.createMap().apply {
                        putBoolean("updateAvailable", isAvailable)
                        putInt("availableVersionCode", info.availableVersionCode())
                        putBoolean("isFlexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))
                        putBoolean("isImmediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
                        putInt("updatePriority", info.updatePriority())
                        putInt("stalenessDays", info.clientVersionStalenessDays() ?: 0)
                    }
                    promise.resolve(map)
                }
                .addOnFailureListener { e ->
                    promise.reject("CHECK_FAILED", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startUpdate(type: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        val info = cachedUpdateInfo
        if (info == null) {
            promise.reject("NO_INFO", "No update info found. Call checkForUpdate first.")
            return
        }

        val updateType = if (type.equals("immediate", ignoreCase = true)) {
            AppUpdateType.IMMEDIATE
        } else {
            AppUpdateType.FLEXIBLE
        }

        try {
            pendingPromise = promise
            val options = AppUpdateOptions.defaultOptions(updateType)
            val started = appUpdateManager.startUpdateFlowForResult(info, activity, options, UPDATE_REQUEST_CODE)
            if (!started) {
                pendingPromise = null
                promise.resolve(false)
            }
        } catch (e: Exception) {
            pendingPromise = null
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun completeUpdate(promise: Promise) {
        try {
            appUpdateManager.completeUpdate()
                .addOnSuccessListener {
                    promise.resolve(true)
                }
                .addOnFailureListener { e ->
                    promise.reject("COMPLETE_FAILED", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("COMPLETE_ERROR", e.message, e)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == UPDATE_REQUEST_CODE) {
            val p = pendingPromise
            pendingPromise = null
            if (resultCode == Activity.RESULT_OK) {
                p?.resolve(true)
            } else if (resultCode == Activity.RESULT_CANCELED) {
                p?.resolve(false)
                sendEvent("onPlayUpdateCancelled", null)
            } else {
                p?.reject("UPDATE_FAILED", "Play Store update result code: $resultCode")
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}

    override fun invalidate() {
        super.invalidate()
        try {
            appUpdateManager.unregisterListener(installStateListener)
            reactContext.removeActivityEventListener(this)
        } catch (e: Exception) {
            // ignore
        }
    }
}
