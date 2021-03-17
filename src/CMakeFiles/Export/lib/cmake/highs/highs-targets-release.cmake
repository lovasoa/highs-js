#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "highs" for configuration "Release"
set_property(TARGET highs APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(highs PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/highs.js"
  )

list(APPEND _IMPORT_CHECK_TARGETS highs )
list(APPEND _IMPORT_CHECK_FILES_FOR_highs "${_IMPORT_PREFIX}/bin/highs.js" )

# Import target "libhighs" for configuration "Release"
set_property(TARGET libhighs APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(libhighs PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libhighs.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS libhighs )
list(APPEND _IMPORT_CHECK_FILES_FOR_libhighs "${_IMPORT_PREFIX}/lib/libhighs.a" )

# Import target "libipx" for configuration "Release"
set_property(TARGET libipx APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(libipx PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libipx.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS libipx )
list(APPEND _IMPORT_CHECK_FILES_FOR_libipx "${_IMPORT_PREFIX}/lib/libipx.a" )

# Import target "libbasiclu" for configuration "Release"
set_property(TARGET libbasiclu APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(libbasiclu PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "C"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libbasiclu.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS libbasiclu )
list(APPEND _IMPORT_CHECK_FILES_FOR_libbasiclu "${_IMPORT_PREFIX}/lib/libbasiclu.a" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
