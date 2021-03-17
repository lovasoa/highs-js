if(NOT TARGET libhighs)
  include("${CMAKE_CURRENT_LIST_DIR}/highs-targets.cmake")
endif()

set(HIGHS_LIBRARIES libhighs)
set(HIGHS_INCLUDE_DIRS "/home/runner/work/highs-js/highs-js/HiGHS/src;/home/runner/work/highs-js/highs-js/build")
set(HIGHS_FOUND TRUE)
